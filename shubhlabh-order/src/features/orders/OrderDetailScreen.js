import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Modal, TextInput, Alert } from 'react-native';
import { ArrowLeft, MoreVertical, Package, MapPin, Edit3, MessageCircle, RotateCcw } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../core/api/supabase';
import { getOrderById } from './OrderService';
import { theme } from '../../shared/theme';
import { useAuth } from '../auth/AuthContext';

const STATUS_STAGES = ['NEW', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'];

export default function OrderDetailScreen({ route, navigation }) {
  const { session } = useAuth();
  const initialOrder = route.params?.order || {};
  const orderId = route.params?.orderId || initialOrder.id;
  
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(true);
  const [itemsExpanded, setItemsExpanded] = useState(false);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

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

  const currentStatus = (order.status || 'NEW').toUpperCase();
  const currentStatusIndex = STATUS_STAGES.indexOf(currentStatus);

  const getStatusColor = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'DISPATCHED' || s === 'DELIVERED' || s === 'RECEIVED') return theme.colors.success;
    if (s === 'NEW' || s === 'CONFIRMED' || s === 'PROCESSING') return theme.colors.warning;
    if (s === 'CANCELLED') return theme.colors.error;
    return theme.colors.textSecondary;
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'NEW': return 'Order received';
      case 'CONFIRMED': return 'Order confirmed by Shubh Labh';
      case 'PROCESSING': return 'Your order is being prepared';
      case 'DISPATCHED': return 'Your order has left Shubh Labh';
      case 'DELIVERED': return 'Order delivered';
      case 'CANCELLED': return 'Order cancelled';
      default: return 'Processing';
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
    // Basic fallback to whatsapp
    Linking.openURL(`whatsapp://send?phone=+910000000000&text=Query regarding order #${order.order_no}`).catch(() => {
      console.warn('WhatsApp not installed');
    });
  };

  const handleSaveAddress = async () => {
    if (!editAddress.trim()) {
      Alert.alert('Error', 'Address cannot be empty.');
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
      rawNotes.address = editAddress.trim();
      
      const newNotesJson = JSON.stringify(rawNotes);
      
      const { error } = await supabase
        .from('requirements')
        .update({ notes: newNotesJson })
        .eq('id', orderId);
        
      if (error) throw error;
      
      // Insert audit log
      await supabase.from('activity_logs').insert({
         actor_id: session?.user?.id || null,
         module: 'Orders',
         action_type: 'UPDATED',
         entity_type: 'requirements',
         entity_id: orderId,
         summary: 'Buyer updated delivery address',
         metadata: { 
           source: 'buyer_app',
           field: 'delivery_address',
           old_value: oldAddress,
           new_value: editAddress.trim()
         }
      });
      
      // Update local state
      setOrder(prev => ({
        ...prev,
        delivery_address: editAddress.trim(),
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
          <ArrowLeft color={theme.colors.textPrimary} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Status Hero */}
        <View style={[styles.card, styles.heroCard]}>
          <Text style={styles.heroOrderNo}>ORDER #{order.order_no}</Text>
          <Text style={styles.heroDate}>{formattedDate} · {formattedTime}</Text>
          
          <View style={styles.heroStatusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(currentStatus) }]} />
            <Text style={[styles.heroStatusTitle, { color: getStatusColor(currentStatus) }]}>{currentStatus}</Text>
          </View>
          <Text style={styles.heroStatusDesc}>{getStatusDescription(currentStatus)}</Text>
        </View>

        {/* Order Progress */}
        {currentStatus !== 'CANCELLED' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order Progress</Text>
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

        {/* Empty State */}
        {items.length === 0 ? (
          <View style={styles.card}>
            <Text style={{ textAlign: 'center', padding: 20, color: theme.colors.textSecondary, fontStyle: 'italic' }}>
              No items found for this order.
            </Text>
          </View>
        ) : (
          <>
            {/* Items */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>ITEMS ({items.length})</Text>
              <View style={styles.itemsWrapper}>
                {displayItems.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemQuantity}>{item.quantity} {item.unit || 'Bags'}</Text>
                      {item.weight && <Text style={styles.itemWeight}>{item.weight} kg</Text>}
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

            {/* Gift Section */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>GIFT / EXTRA</Text>
              {hasGifts ? (
                items.filter(i => i.gift).map((item, idx) => (
                  <View key={idx} style={styles.giftRow}>
                    <Text style={styles.giftIcon}>🎁</Text>
                    <View>
                      <Text style={styles.giftText}>{item.gift === 'Others' ? item.other_gift : item.gift}</Text>
                      <Text style={styles.giftSub}>For {item.product_name}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic', paddingVertical: 8 }}>No gift added</Text>
              )}
            </View>

            {/* Order Summary */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Products</Text>
                <Text style={styles.summaryValue}>{items.length} Products</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Quantity</Text>
                <Text style={styles.summaryValue}>{totalBags} Bags</Text>
              </View>
              {items.some(i => i.weight) && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Weight</Text>
                  <Text style={styles.summaryValue}>{totalWeight} kg</Text>
                </View>
              )}
            </View>
          </>
        )}
        
        {/* Delivery / Notes */}
        <View style={styles.card}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
            <Text style={[styles.sectionTitle, {marginBottom: 0}]}>DELIVERY</Text>
            <TouchableOpacity onPress={() => {
                setEditAddress(order.delivery_address === 'null' || order.delivery_address === '{}' ? '' : (order.delivery_address || ''));
                setShowAddressModal(true);
              }} style={styles.editAddressBtn}>
              <Edit3 size={16} color={theme.colors.primary} />
              <Text style={styles.editAddressText}>
                {(!order.delivery_address || order.delivery_address === 'null' || order.delivery_address === '{}') ? 'Add' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.deliveryRow}>
            <MapPin size={20} color={theme.colors.textSecondary} />
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
              <Edit3 color={theme.colors.white} size={20} />
              <Text style={styles.primaryActionBtnText}>Edit Order</Text>
            </TouchableOpacity>
          )}

          {(currentStatus === 'DELIVERED') && (
            <TouchableOpacity 
              style={[styles.primaryActionBtn, { flex: 1, marginRight: 8 }]} 
              onPress={handleReorderOrder}
            >
              <RotateCcw color={theme.colors.white} size={20} />
              <Text style={styles.primaryActionBtnText}>Reorder</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.secondaryActionBtn, currentStatus !== 'NEW' && currentStatus !== 'CONFIRMED' && currentStatus !== 'DELIVERED' ? { flex: 1 } : {}]} onPress={handleContact}>
            <MessageCircle color={theme.colors.primary} size={20} />
            <Text style={styles.secondaryActionBtnText}>Contact</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Address Edit Modal */}
      <Modal visible={showAddressModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delivery Address</Text>
            <TextInput
              style={styles.modalInput}
              value={editAddress}
              onChangeText={setEditAddress}
              placeholder="Enter delivery address"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
            />
            <View style={styles.modalActions}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.textPrimary },
  backButton: { padding: 8, marginLeft: -8 },
  actionButton: { padding: 8, marginRight: -8 },
  
  content: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border, ...theme.elevation.sm },
  
  heroCard: { borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  heroOrderNo: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  heroDate: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16 },
  heroStatusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  heroStatusTitle: { fontSize: 16, fontWeight: 'bold' },
  heroStatusDesc: { fontSize: 14, color: theme.colors.textSecondary, marginLeft: 18 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 16, letterSpacing: 0.5 },
  
  progressContainer: { marginLeft: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'flex-start' },
  progressTimeline: { alignItems: 'center', width: 20, marginRight: 12 },
  progressNode: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, zIndex: 2, backgroundColor: theme.colors.surface },
  progressNodeCompleted: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  progressNodePending: { borderColor: theme.colors.border },
  progressNodeCurrent: { width: 16, height: 16, borderRadius: 8, borderWidth: 4, borderColor: theme.colors.primary },
  progressLine: { width: 2, height: 24, marginVertical: -2, zIndex: 1 },
  progressLineCompleted: { backgroundColor: theme.colors.primary },
  progressLinePending: { backgroundColor: theme.colors.border },
  
  progressText: { fontSize: 15, fontWeight: '500', marginTop: -2, paddingBottom: 24 },
  progressTextCompleted: { color: theme.colors.textPrimary },
  progressTextPending: { color: theme.colors.textMuted },
  progressTextCurrent: { color: theme.colors.primary, fontWeight: '700', fontSize: 16 },

  itemsWrapper: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background },
  itemName: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 2 },
  itemCategory: { fontSize: 13, color: theme.colors.textSecondary },
  itemRight: { alignItems: 'flex-end' },
  itemQuantity: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  itemWeight: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  expandButton: { padding: 12, alignItems: 'center', backgroundColor: theme.colors.surface },
  expandButtonText: { color: theme.colors.primary, fontWeight: '600', fontSize: 14 },

  giftRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, backgroundColor: '#FEF3C7', borderRadius: theme.radius.md, marginBottom: 8 },
  giftIcon: { fontSize: 20, marginRight: 12 },
  giftText: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  giftSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  summaryLabel: { fontSize: 15, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 16, color: theme.colors.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },

  deliveryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  deliveryText: { fontSize: 15, color: theme.colors.textPrimary, marginLeft: 12, flex: 1, lineHeight: 22 },
  notesContainer: { backgroundColor: theme.colors.background, padding: 12, borderRadius: theme.radius.md },
  notesLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 4 },
  notesText: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 20 },

  bottomBar: { flexDirection: 'row', padding: 16, paddingBottom: 32, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  primaryActionBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: theme.radius.button },
  primaryActionBtnText: { color: theme.colors.white, fontSize: 16, fontWeight: '600', marginLeft: 8 },
  secondaryActionBtn: { backgroundColor: theme.colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: theme.radius.button, borderWidth: 1, borderColor: theme.colors.primary },
  secondaryActionBtnText: { color: theme.colors.primary, fontSize: 16, fontWeight: '600', marginLeft: 8 },

  editAddressBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#EFF6FF', borderRadius: 6 },
  editAddressText: { color: theme.colors.primary, fontSize: 13, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 24, ...theme.elevation.md },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: 16 },
  modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 12, fontSize: 15, color: theme.colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  modalCancelText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: '600' },
  modalSave: { backgroundColor: theme.colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  modalSaveText: { color: theme.colors.white, fontSize: 15, fontWeight: '600' },
});
