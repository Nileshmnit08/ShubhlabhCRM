import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Modal, TextInput, Alert } from 'react-native';
import { ArrowLeft, Package, MapPin, Edit3, MessageCircle, RotateCcw, Truck, Calendar, CheckCircle2, XCircle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../core/api/supabase';
import { getOrderById } from './OrderService';
import { theme } from '../../shared/theme';
import { useAuth } from '../auth/AuthContext';
import SLStatusBadge from '../../shared/components/SLStatusBadge';
import * as Location from 'expo-location';

export const SUPPORT_PHONE_NUMBER = '9461924461';
const STATUS_STAGES = ['NEW', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'];

export default function OrderDetailScreen({ route, navigation }) {
  const { session } = useAuth();
  const initialOrder = route.params?.order || {};
  const orderId = route.params?.orderId || initialOrder.id;
  
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(true);
  const [itemsExpanded, setItemsExpanded] = useState(false);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressDetails, setAddressDetails] = useState({
    house: '',
    street: '',
    landmark: '',
    city: '',
    district: '',
    state: '',
    pin: '',
    formatted: '',
    latitude: null,
    longitude: null
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (orderId) {
        fetchOrderDetails();
      }
    }, [orderId])
  );

  const fetchOrderDetails = async () => {
    try {
      const canonicalOrder = await getOrderById(orderId);
      if (canonicalOrder) {
        setOrder(canonicalOrder);
      }
    } catch (err) {
      console.warn('Failed to fetch order details:', err);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const formattedTime = order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';

  let items = order.items || [];
  
  const totalBags = order.totalQuantity || items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalWeight = order.totalWeight || 0;
  const hasGifts = items.some(item => item.gift);

  // Calculate order total if item rates/prices exist
  const hasPrices = items.some(item => typeof item.price === 'number' && item.price > 0);
  const calculatedOrderTotal = hasPrices 
    ? items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0)
    : null;

  const currentStatus = (order.status || 'NEW').toUpperCase();
  
  // Calculate progress index based on canonical lifecycle
  let currentStatusIndex = STATUS_STAGES.indexOf(currentStatus);
  if (currentStatus === 'PARTIALLY DISPATCHED') {
    currentStatusIndex = 2; // Processing / In transit
  } else if (currentStatus === 'CLOSED') {
    currentStatusIndex = (order.dispatches && order.dispatches.length > 0) ? 3 : 2;
  }

  const getStatusColor = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'DISPATCHED' || s === 'DELIVERED' || s === 'RECEIVED') return theme.colors.success || '#16A34A';
    if (s === 'PARTIALLY DISPATCHED') return '#0284C7';
    if (s === 'NEW' || s === 'CONFIRMED' || s === 'PROCESSING') return theme.colors.warning || '#D97706';
    if (s === 'CANCELLED') return theme.colors.error || '#DC2626';
    return theme.colors.textSecondary;
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'NEW': return 'Order received by Shubh Labh';
      case 'CONFIRMED': return 'Order confirmed by sales team';
      case 'PROCESSING': return 'Your feed is being prepared at the mill';
      case 'PARTIALLY DISPATCHED': return 'Partially dispatched — goods in transit';
      case 'DISPATCHED': return 'Dispatched — on the way from Shubh Labh';
      case 'DELIVERED': return 'Order delivered successfully';
      case 'CANCELLED': return 'Order cancelled';
      case 'CLOSED': return 'Order completed';
      default: return 'Order in progress';
    }
  };

  const displayItems = itemsExpanded ? items : items.slice(0, 3);
  const hiddenItemsCount = items.length - 3;

  const handleEditOrder = () => {
    navigation.navigate('MainTabs', { screen: 'NewOrderTab', params: { screen: 'NewOrderMain', params: { previousOrder: order, mode: 'edit', ts: Date.now() } } });
  };

  const handleReorderOrder = () => {
    navigation.navigate('MainTabs', { screen: 'NewOrderTab', params: { screen: 'NewOrderMain', params: { previousOrder: order, mode: 'reorder', ts: Date.now() } } });
  };

  const handleContact = () => {
    const message = encodeURIComponent(`Query regarding order #${order.order_no}`);
    const url = `whatsapp://send?phone=+91${SUPPORT_PHONE_NUMBER}&text=${message}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          return Linking.openURL(`tel:+91${SUPPORT_PHONE_NUMBER}`);
        }
      })
      .catch(() => {
        Linking.openURL(`tel:+91${SUPPORT_PHONE_NUMBER}`);
      });
  };

  const handleCaptureLocation = async () => {
    setCapturingLocation(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Allow location access to use this feature.');
      setCapturingLocation(false);
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      let newDetails = { ...addressDetails, latitude: location.coords.latitude, longitude: location.coords.longitude };
      
      if (geocode && geocode.length > 0) {
        const addr = geocode[0];
        newDetails.house = addr.streetNumber || '';
        newDetails.street = addr.street || '';
        newDetails.city = addr.city || addr.subregion || '';
        newDetails.district = addr.subregion || '';
        newDetails.state = addr.region || '';
        newDetails.pin = addr.postalCode || '';
        
        const parts = [newDetails.house, newDetails.street, newDetails.city, newDetails.district, newDetails.state, newDetails.pin].filter(Boolean);
        newDetails.formatted = parts.join(', ');
      }
      setAddressDetails(newDetails);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch location.');
    } finally {
      setCapturingLocation(false);
    }
  };

  const handleEditAddressClick = () => {
    let rawNotes = {};
    try {
      rawNotes = JSON.parse(order._raw?.notes || '{}');
    } catch (e) {}

    if (rawNotes.structured_address) {
      setAddressDetails(rawNotes.structured_address);
    } else {
      setAddressDetails({
        house: '',
        street: '',
        landmark: '',
        city: '',
        district: '',
        state: '',
        pin: '',
        formatted: order.delivery_address || '',
        latitude: null,
        longitude: null
      });
    }
    setShowAddressModal(true);
  };

  const handleSaveAddress = async () => {
    if (!addressDetails.formatted?.trim()) {
      Alert.alert('Error', 'Formatted address cannot be empty.');
      return;
    }
    setSavingAddress(true);
    try {
      let rawNotes = {};
      if (order._raw && order._raw.notes) {
        try {
          rawNotes = JSON.parse(order._raw.notes);
        } catch(e) {}
      }
      
      const oldAddress = rawNotes.address || '';
      rawNotes.address = addressDetails.formatted.trim();
      rawNotes.structured_address = addressDetails;
      
      const newNotesJson = JSON.stringify(rawNotes);
      
      const { error } = await supabase
        .from('requirements')
        .update({ notes: newNotesJson })
        .eq('id', orderId);
        
      if (error) throw error;
      
      // Update local state
      setOrder(prev => ({
        ...prev,
        delivery_address: addressDetails.formatted.trim(),
        _raw: {
          ...prev._raw,
          notes: newNotesJson
        }
      }));
      setShowAddressModal(false);
      Alert.alert('Success', 'Delivery address updated.');
    } catch (err) {
      console.error('Error saving address:', err);
      Alert.alert('Error', 'Could not save the address.');
    } finally {
      setSavingAddress(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Status Hero Card */}
        <View style={[styles.card, styles.heroCard]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroOrderNo}>ORDER #{order.order_no}</Text>
              <Text style={styles.heroDate}>{formattedDate} · {formattedTime}</Text>
            </View>
            <View style={styles.itemsCountPill}>
              <Text style={styles.itemsCountText}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
            </View>
          </View>
          
          <View style={styles.heroStatusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(currentStatus) }]} />
            <Text style={[styles.heroStatusTitle, { color: getStatusColor(currentStatus) }]}>{currentStatus}</Text>
          </View>
          <Text style={styles.heroStatusDesc}>{getStatusDescription(currentStatus)}</Text>

          {calculatedOrderTotal !== null ? (
            <View style={styles.heroAmountRow}>
              <Text style={styles.heroAmountLabel}>Total Amount: </Text>
              <Text style={styles.heroAmountValue}>₹{calculatedOrderTotal.toLocaleString('en-IN')}</Text>
            </View>
          ) : null}
        </View>

        {/* Order Lifecycle Progress */}
        {currentStatus === 'CANCELLED' ? (
          <View style={[styles.card, styles.cancelledCard]}>
            <View style={styles.cancelledHeader}>
              <XCircle size={22} color="#DC2626" />
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            </View>
            <Text style={styles.cancelledDesc}>
              This order has been cancelled and will not be prepared or dispatched.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>ORDER PROGRESS</Text>
            <View style={styles.progressContainer}>
              {STATUS_STAGES.map((stage, idx) => {
                const isCompleted = currentStatusIndex >= idx;
                const isCurrent = currentStatusIndex === idx;
                return (
                  <View key={stage} style={styles.progressRow}>
                    <View style={styles.progressTimeline}>
                      <View style={[
                        styles.progressNode, 
                        isCompleted ? styles.progressNodeCompleted : styles.progressNodePending,
                        isCurrent && styles.progressNodeCurrent
                      ]} />
                      {idx < STATUS_STAGES.length - 1 && (
                        <View style={[
                          styles.progressLine,
                          currentStatusIndex > idx ? styles.progressLineCompleted : styles.progressLinePending
                        ]} />
                      )}
                    </View>
                    <Text style={[
                      styles.progressText,
                      isCompleted ? styles.progressTextCompleted : styles.progressTextPending,
                      isCurrent && styles.progressTextCurrent
                    ]}>
                      {stage}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Order Items */}
        {items.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyItemsText}>
              No items found for this order.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>ITEMS ({items.length})</Text>
              <View style={styles.itemsWrapper}>
                {displayItems.map((item, idx) => (
                  <View key={item.id || idx} style={styles.itemRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={styles.itemNameRow}>
                        <Text style={styles.itemIndex}>{idx + 1}. </Text>
                        <Text style={styles.itemName}>{item.product_name}</Text>
                      </View>
                      <View style={styles.itemMetaRow}>
                        <Text style={styles.itemCategory}>{item.category}</Text>
                        {item.weight ? (
                          <Text style={styles.itemWeightPill}>{item.weight} kg pack</Text>
                        ) : null}
                      </View>
                      {item.price ? (
                        <Text style={styles.itemRate}>₹{item.price} / {item.unit || 'Bag'}</Text>
                      ) : null}
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemQuantity}>{item.quantity} {item.unit || 'Bags'}</Text>
                      {item.price ? (
                        <Text style={styles.itemLineTotal}>₹{(item.quantity * item.price).toLocaleString('en-IN')}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
              {!itemsExpanded && hiddenItemsCount > 0 && (
                <TouchableOpacity onPress={() => setItemsExpanded(true)} style={styles.expandButton}>
                  <Text style={styles.expandButtonText}>+ {hiddenItemsCount} more items</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Gifts / Extras */}
            {hasGifts && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>GIFT / EXTRA</Text>
                {items.filter(i => i.gift).map((item, idx) => (
                  <View key={idx} style={styles.giftRow}>
                    <Text style={styles.giftIcon}>🎁</Text>
                    <View>
                      <Text style={styles.giftText}>{item.gift === 'Others' ? item.other_gift : item.gift}</Text>
                      <Text style={styles.giftSub}>For {item.product_name}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Order Summary */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Distinct Products</Text>
                <Text style={styles.summaryValue}>{items.length} Products</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Quantity</Text>
                <Text style={styles.summaryValueBold}>{totalBags} Bags</Text>
              </View>
              {totalWeight > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Weight</Text>
                  <Text style={styles.summaryValue}>{totalWeight.toLocaleString('en-IN')} kg</Text>
                </View>
              ) : null}
              {calculatedOrderTotal !== null ? (
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={styles.summaryTotalLabel}>Order Amount</Text>
                  <Text style={styles.summaryTotalValue}>₹{calculatedOrderTotal.toLocaleString('en-IN')}</Text>
                </View>
              ) : null}
            </View>

            {/* Logistics & Dispatch Information */}
            {order.dispatches && order.dispatches.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.sectionTitle}>DISPATCH & LOGISTICS ({order.dispatches.length})</Text>
                  <Truck size={18} color={theme.colors.primary} />
                </View>

                {order.dispatches.map((disp, idx) => (
                  <View key={disp.id || idx} style={[styles.dispatchCard, idx > 0 && styles.dispatchCardDivider]}>
                    <View style={styles.dispatchHeader}>
                      <Text style={styles.dispatchTitle}>
                        {order.dispatches.length > 1 ? `Dispatch #${idx + 1}` : 'Dispatch Details'}
                      </Text>
                      <SLStatusBadge 
                        status={disp.status === 'Delivered' ? 'success' : 'info'} 
                        text={(disp.status || 'DISPATCHED').toUpperCase()} 
                      />
                    </View>

                    <View style={styles.dispatchDetailRow}>
                      <Text style={styles.dispatchLabel}>Date:</Text>
                      <Text style={styles.dispatchValue}>{disp.dispatch_date || 'N/A'}</Text>
                    </View>

                    <View style={styles.dispatchDetailRow}>
                      <Text style={styles.dispatchLabel}>Dispatched Quantity:</Text>
                      <Text style={styles.dispatchValueBold}>{disp.quantity} {disp.unit || 'Bags'}</Text>
                    </View>

                    {disp.return_quantity > 0 ? (
                      <View style={styles.dispatchDetailRow}>
                        <Text style={styles.dispatchLabel}>Returned Quantity:</Text>
                        <Text style={[styles.dispatchValue, { color: '#DC2626' }]}>- {disp.return_quantity} {disp.unit || 'Bags'}</Text>
                      </View>
                    ) : null}

                    {disp.return_quantity > 0 ? (
                      <View style={styles.dispatchDetailRow}>
                        <Text style={styles.dispatchLabel}>Net Delivered:</Text>
                        <Text style={styles.dispatchValueBold}>{disp.net_quantity} {disp.unit || 'Bags'}</Text>
                      </View>
                    ) : null}

                    {disp.truck_number ? (
                      <View style={styles.dispatchDetailRow}>
                        <Text style={styles.dispatchLabel}>Truck / Vehicle:</Text>
                        <Text style={styles.dispatchValue}>{disp.truck_number}</Text>
                      </View>
                    ) : null}

                    {disp.transporter_name ? (
                      <View style={styles.dispatchDetailRow}>
                        <Text style={styles.dispatchLabel}>Transporter:</Text>
                        <Text style={styles.dispatchValue}>{disp.transporter_name}</Text>
                      </View>
                    ) : null}

                    {disp.driver_name ? (
                      <View style={styles.dispatchDetailRow}>
                        <Text style={styles.dispatchLabel}>Driver:</Text>
                        <Text style={styles.dispatchValue}>{disp.driver_name} {disp.driver_mobile ? `(${disp.driver_mobile})` : ''}</Text>
                      </View>
                    ) : null}

                    {disp.lr_bilty_number ? (
                      <View style={styles.dispatchDetailRow}>
                        <Text style={styles.dispatchLabel}>LR / Bilty No:</Text>
                        <Text style={styles.dispatchValue}>{disp.lr_bilty_number}</Text>
                      </View>
                    ) : null}

                    {disp.actual_delivery_date ? (
                      <View style={[styles.dispatchDetailRow, styles.deliverySuccessRow]}>
                        <Text style={styles.deliverySuccessLabel}>Delivered Date:</Text>
                        <Text style={styles.deliverySuccessValue}>{disp.actual_delivery_date}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        
        {/* Delivery Address & Notes */}
        <View style={styles.card}>
          <View style={styles.deliveryHeaderRow}>
            <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
            <TouchableOpacity onPress={handleEditAddressClick} style={styles.editAddressBtn}>
              <Edit3 size={15} color={theme.colors.primary} />
              <Text style={styles.editAddressText}>
                {(!order.delivery_address || order.delivery_address === 'null' || order.delivery_address === '{}') ? 'Add' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.deliveryRow}>
            <MapPin size={20} color={theme.colors.primary} />
            <Text style={styles.deliveryText}>
              {order.delivery_address && order.delivery_address !== 'null' && order.delivery_address !== '{}' 
                ? order.delivery_address 
                : 'No delivery address saved.'}
            </Text>
          </View>

          {order._raw && order._raw.original_notes && !order._raw.original_notes.startsWith('{') && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>NOTES</Text>
              <Text style={styles.notesText}>{order._raw.original_notes}</Text>
            </View>
          )}
        </View>

        {/* Extra Bottom Padding so Sticky Action Bar never overlaps content */}
        <View style={{ height: 110 }} />
      </ScrollView>
      )}

      {/* Sticky Bottom Actions */}
      {!loading && (
        <View style={styles.bottomBar}>
          {(currentStatus === 'NEW' || currentStatus === 'CONFIRMED') && (
            <TouchableOpacity 
              style={[styles.primaryActionBtn, { flex: 1, marginRight: 8 }]} 
              onPress={handleEditOrder}
            >
              <Edit3 color={theme.colors.white} size={18} />
              <Text style={styles.primaryActionBtnText}>Edit Order</Text>
            </TouchableOpacity>
          )}

          {(currentStatus === 'DISPATCHED' || currentStatus === 'DELIVERED' || currentStatus === 'CLOSED') && (
            <TouchableOpacity 
              style={[styles.primaryActionBtn, { flex: 1, marginRight: 8 }]} 
              onPress={handleReorderOrder}
            >
              <RotateCcw color={theme.colors.white} size={18} />
              <Text style={styles.primaryActionBtnText}>Repeat Order</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.secondaryActionBtn, 
              currentStatus !== 'NEW' && currentStatus !== 'CONFIRMED' && currentStatus !== 'DISPATCHED' && currentStatus !== 'DELIVERED' && currentStatus !== 'CLOSED' 
                ? { flex: 1 } 
                : {}
            ]} 
            onPress={handleContact}
          >
            <MessageCircle color={theme.colors.primary} size={18} />
            <Text style={styles.secondaryActionBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Address Edit Modal */}
      <Modal visible={showAddressModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', padding: 0 }]}>
            <View style={{ padding: 18, borderBottomWidth: 1, borderColor: theme.colors.border }}>
              <Text style={styles.modalTitle}>Delivery Address</Text>
            </View>
            
            <ScrollView style={{ padding: 18 }}>
              <TouchableOpacity style={styles.gpsBtn} onPress={handleCaptureLocation} disabled={capturingLocation}>
                {capturingLocation ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <MapPin color={theme.colors.primary} size={18} />}
                <Text style={styles.gpsBtnText}>Use My Current GPS Location</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>House / Shop No.</Text>
              <TextInput style={styles.modalInput} value={addressDetails.house} onChangeText={(t) => setAddressDetails(p => ({...p, house: t, formatted: [t, p.street, p.city, p.district, p.state, p.pin].filter(Boolean).join(', ')}))} placeholder="e.g. 104" />
              
              <Text style={styles.inputLabel}>Street / Area</Text>
              <TextInput style={styles.modalInput} value={addressDetails.street} onChangeText={(t) => setAddressDetails(p => ({...p, street: t, formatted: [p.house, t, p.city, p.district, p.state, p.pin].filter(Boolean).join(', ')}))} placeholder="e.g. Main Market" />
              
              <Text style={styles.inputLabel}>Landmark</Text>
              <TextInput style={styles.modalInput} value={addressDetails.landmark} onChangeText={(t) => setAddressDetails(p => ({...p, landmark: t}))} placeholder="e.g. Near Post Office" />
              
              <Text style={styles.inputLabel}>City / Village</Text>
              <TextInput style={styles.modalInput} value={addressDetails.city} onChangeText={(t) => setAddressDetails(p => ({...p, city: t, formatted: [p.house, p.street, t, p.district, p.state, p.pin].filter(Boolean).join(', ')}))} placeholder="City" />
              
              <Text style={styles.inputLabel}>District</Text>
              <TextInput style={styles.modalInput} value={addressDetails.district} onChangeText={(t) => setAddressDetails(p => ({...p, district: t, formatted: [p.house, p.street, p.city, t, p.state, p.pin].filter(Boolean).join(', ')}))} placeholder="District" />
              
              <Text style={styles.inputLabel}>State</Text>
              <TextInput style={styles.modalInput} value={addressDetails.state} onChangeText={(t) => setAddressDetails(p => ({...p, state: t, formatted: [p.house, p.street, p.city, p.district, t, p.pin].filter(Boolean).join(', ')}))} placeholder="State" />
              
              <Text style={styles.inputLabel}>PIN Code</Text>
              <TextInput style={styles.modalInput} value={addressDetails.pin} onChangeText={(t) => setAddressDetails(p => ({...p, pin: t, formatted: [p.house, p.street, p.city, p.district, p.state, t].filter(Boolean).join(', ')}))} placeholder="PIN" keyboardType="numeric" />

              <Text style={styles.inputLabel}>Full Formatted Address (Required)</Text>
              <TextInput
                style={[styles.modalInput, { height: 75 }]}
                value={addressDetails.formatted}
                onChangeText={(t) => setAddressDetails(p => ({...p, formatted: t}))}
                placeholder="Enter full formatted address"
                multiline
              />
            </ScrollView>

            <View style={[styles.modalActions, { padding: 18, borderTopWidth: 1, borderColor: theme.colors.border }]}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddressModal(false)} disabled={savingAddress}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveAddress} disabled={savingAddress}>
                {savingAddress ? <ActivityIndicator color={theme.colors.white} size="small" /> : <Text style={styles.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: 54, 
    paddingBottom: 14, 
    backgroundColor: theme.colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.border 
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  backButton: { padding: 6, marginLeft: -6 },
  
  content: { padding: 16 },
  
  card: { 
    backgroundColor: theme.colors.surface, 
    borderRadius: 14, 
    padding: 16, 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    ...theme.elevation.sm 
  },
  
  heroCard: { borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  heroOrderNo: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 2 },
  heroDate: { fontSize: 13, color: theme.colors.textSecondary },
  itemsCountPill: { backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA' },
  itemsCountText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  
  heroStatusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  heroStatusTitle: { fontSize: 15, fontWeight: '700' },
  heroStatusDesc: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 18, marginBottom: 8 },
  heroAmountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  heroAmountLabel: { fontSize: 13, color: theme.colors.textSecondary },
  heroAmountValue: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },

  cancelledCard: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  cancelledHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cancelledTitle: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  cancelledDesc: { fontSize: 13, color: '#991B1B', lineHeight: 18 },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 14, letterSpacing: 0.6 },
  
  progressContainer: { marginLeft: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'flex-start' },
  progressTimeline: { alignItems: 'center', width: 20, marginRight: 12 },
  progressNode: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, zIndex: 2, backgroundColor: theme.colors.surface },
  progressNodeCompleted: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  progressNodePending: { borderColor: theme.colors.border },
  progressNodeCurrent: { width: 16, height: 16, borderRadius: 8, borderWidth: 4, borderColor: theme.colors.primary },
  progressLine: { width: 2, height: 22, marginVertical: -2, zIndex: 1 },
  progressLineCompleted: { backgroundColor: theme.colors.primary },
  progressLinePending: { backgroundColor: theme.colors.border },
  
  progressText: { fontSize: 14, fontWeight: '500', marginTop: -2, paddingBottom: 22 },
  progressTextCompleted: { color: theme.colors.textPrimary },
  progressTextPending: { color: theme.colors.textMuted },
  progressTextCurrent: { color: theme.colors.primary, fontWeight: '700' },

  itemsWrapper: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background },
  itemNameRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itemIndex: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
  itemName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, flex: 1 },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  itemCategory: { fontSize: 12, color: theme.colors.textSecondary },
  itemWeightPill: { fontSize: 11, color: theme.colors.primary, backgroundColor: '#FFF7ED', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  itemRate: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  itemRight: { alignItems: 'flex-end', justifyContent: 'center' },
  itemQuantity: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  itemLineTotal: { fontSize: 13, fontWeight: '700', color: theme.colors.primary, marginTop: 2 },
  expandButton: { padding: 10, alignItems: 'center', backgroundColor: theme.colors.surface },
  expandButtonText: { color: theme.colors.primary, fontWeight: '600', fontSize: 13 },
  emptyItemsText: { textAlign: 'center', padding: 16, color: theme.colors.textSecondary, fontStyle: 'italic' },

  giftRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, backgroundColor: '#FEF3C7', borderRadius: 10, marginBottom: 6 },
  giftIcon: { fontSize: 18, marginRight: 10 },
  giftText: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  giftSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 1 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  summaryLabel: { fontSize: 14, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '600' },
  summaryValueBold: { fontSize: 15, color: theme.colors.textPrimary, fontWeight: '700' },
  summaryTotalRow: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10, marginTop: 8 },
  summaryTotalLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  summaryTotalValue: { fontSize: 17, fontWeight: '700', color: theme.colors.primary },

  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dispatchCard: { paddingVertical: 6 },
  dispatchCardDivider: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, marginTop: 8 },
  dispatchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dispatchTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary },
  dispatchDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dispatchLabel: { fontSize: 13, color: theme.colors.textSecondary },
  dispatchValue: { fontSize: 13, color: theme.colors.textPrimary },
  dispatchValueBold: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  deliverySuccessRow: { backgroundColor: '#F0FDF4', padding: 8, borderRadius: 6, marginTop: 4 },
  deliverySuccessLabel: { fontSize: 12, color: '#166534', fontWeight: '600' },
  deliverySuccessValue: { fontSize: 12, color: '#166534', fontWeight: '700' },

  deliveryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  deliveryRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  deliveryText: { fontSize: 14, color: theme.colors.textPrimary, marginLeft: 10, flex: 1, lineHeight: 20 },
  notesContainer: { backgroundColor: theme.colors.background, padding: 10, borderRadius: 8, marginTop: 8 },
  notesLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 2 },
  notesText: { fontSize: 13, color: theme.colors.textPrimary, lineHeight: 18 },

  bottomBar: { 
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingTop: 12, 
    paddingBottom: 28, 
    backgroundColor: theme.colors.surface, 
    borderTopWidth: 1, 
    borderTopColor: theme.colors.border,
    ...theme.elevation.md
  },
  primaryActionBtn: { 
    backgroundColor: theme.colors.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    borderRadius: 10, 
    gap: 6 
  },
  primaryActionBtnText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
  secondaryActionBtn: { 
    backgroundColor: theme.colors.background, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: theme.colors.border,
    gap: 6
  },
  secondaryActionBtnText: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600' },

  editAddressBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#EFF6FF', borderRadius: 6 },
  editAddressText: { color: theme.colors.primary, fontSize: 12, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { width: '100%', backgroundColor: theme.colors.surface, borderRadius: 16, overflow: 'hidden', ...theme.elevation.md },
  modalTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary },
  modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: theme.colors.textPrimary, marginBottom: 10 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 4 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', paddingVertical: 10, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.primary },
  gpsBtnText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  modalCancelText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  modalSave: { backgroundColor: theme.colors.primary, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  modalSaveText: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
});
