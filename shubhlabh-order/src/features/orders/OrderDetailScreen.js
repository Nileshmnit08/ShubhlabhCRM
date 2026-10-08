import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { ArrowLeft, MoreVertical, Package, MapPin, Edit3, MessageCircle, RotateCcw } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../core/api/supabase';
import { theme } from '../../shared/theme';

const STATUS_STAGES = ['NEW', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'];

export default function OrderDetailScreen({ route, navigation }) {
  const initialOrder = route.params?.order || {};
  const orderId = route.params?.orderId || initialOrder.id;
  
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(true);
  const [itemsExpanded, setItemsExpanded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (orderId) {
        fetchOrderDetails();
      }
    }, [orderId])
  );

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('requirements')
        .select('*, requirement_items(*), crm_parties(name)')
        .eq('id', orderId)
        .single();
        
      if (data) {
        let extras = {};
        let parsedAddress = data.notes || '';
        try {
          const parsed = JSON.parse(data.notes);
          if (parsed && parsed.extras) {
            extras = parsed.extras;
            parsedAddress = parsed.address;
          }
        } catch(e) {}

        const mappedOrder = {
          ...data,
          order_no: data.demand_ref || data.id?.substring(0, 6) || 'PENDING',
          delivery_address: parsedAddress,
          original_notes: data.notes,
          requirement_items: data.requirement_items?.map(item => {
             const key = `${item.category}_${item.product_name}`;
             return {
               ...item,
               product_name: item.product_name || 'Unknown Product',
               category: item.category || 'Unknown',
               unit: item.unit || extras[key]?.unit || 'Bags',
               quantity: item.quantity,
               weight: extras[key]?.weight || null,
               gift: extras[key]?.gift || null,
               other_gift: extras[key]?.other_gift || null
             };
          }),
          customer_name: data.crm_parties?.name || ''
        };
        setOrder(mappedOrder);
      }
    } catch (err) {
      console.warn('Failed to fetch order details:', err);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const formattedTime = order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';

  let items = order.requirement_items || [];
  
  const totalBags = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
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

  const handleEditReorder = () => {
    navigation.navigate('NewOrderTab', { screen: 'NewOrderMain', params: { previousOrder: order } });
  };

  const handleContact = () => {
    // Basic fallback to whatsapp
    Linking.openURL(`whatsapp://send?phone=+910000000000&text=Query regarding order #${order.order_no}`).catch(() => {
      console.warn('WhatsApp not installed');
    });
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

        {/* Customer Info */}
        {order.customer_name && (
          <View style={[styles.card, { paddingVertical: 12 }]}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary }}>{order.customer_name}</Text>
          </View>
        )}

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

        {/* Items */}
        {items.length > 0 && (
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
        )}

        {/* Gift Section */}
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
              <Text style={styles.summaryValue}>{items.reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 0), 0)} kg</Text>
            </View>
          )}
        </View>
        
        {/* Delivery / Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DELIVERY</Text>
          <View style={styles.deliveryRow}>
            <MapPin size={20} color={theme.colors.textSecondary} />
            <Text style={styles.deliveryText}>
              {order.delivery_address && order.delivery_address !== 'null' && order.delivery_address !== '{}' 
                ? order.delivery_address 
                : 'Saved Address'}
            </Text>
          </View>

          {order.original_notes && !order.original_notes.startsWith('{') && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>NOTES</Text>
              <Text style={styles.notesText}>{order.original_notes}</Text>
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
              onPress={handleEditReorder}
            >
              <Edit3 color={theme.colors.white} size={20} />
              <Text style={styles.primaryActionBtnText}>Edit Order</Text>
            </TouchableOpacity>
          )}

          {(currentStatus === 'DELIVERED') && (
            <TouchableOpacity 
              style={[styles.primaryActionBtn, { flex: 1, marginRight: 8 }]} 
              onPress={handleEditReorder}
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
});
