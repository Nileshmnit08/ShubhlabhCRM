import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, typography, elevation } from '../theme/tokens';
import { OrderSummaryView } from '../components';
import { SyncService } from '../services/SyncService';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export function OrderDetailScreen({ navigation, route }) {
  const formatDateFull = (dateString) => {
    const d = new Date(dateString);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
  };

  const { orderId, orderData: initialOrderData } = route.params;
  const { session } = useAuth();
  
  const [orderData, setOrderData] = useState(initialOrderData);
  const [loading, setLoading] = useState(false);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      // Fetch from server
      const { data: serverOrder, error } = await supabase
        .from('requirements')
        .select(`
          *,
          crm_parties (
            display_name,
            mobile
          ),
          requirement_items (*)
        `)
        .eq('id', orderId)
        .single();

      let activeOrder = serverOrder || orderData; // fallback to initial if offline

      // Overlay local queue
      if (session?.user?.id) {
         const queue = await SyncService.getQueue(session.user.id) || [];
         
         const reqOps = queue.filter(op => op.table === 'requirements' && op.payload?.id === orderId && ['PENDING','FAILED','SYNCING'].includes(op.status));
         reqOps.forEach(op => {
            if (op.action === 'update' || op.action === 'upsert') {
               activeOrder = { ...activeOrder, ...op.payload };
            }
         });

         const itemOps = queue.filter(op => op.table === 'requirement_items' && op.payload?.requirement_id === orderId && ['PENDING','FAILED','SYNCING'].includes(op.status));
         let mergedItems = [...(activeOrder.requirement_items || [])];
         
         itemOps.forEach(op => {
            if (op.action === 'delete') {
               mergedItems = mergedItems.filter(i => i.id !== op.payload.id);
            } else if (op.action === 'update' || op.action === 'upsert' || op.action === 'insert') {
               const existingIdx = mergedItems.findIndex(i => i.id === op.payload.id);
               if (existingIdx >= 0) {
                  mergedItems[existingIdx] = { ...mergedItems[existingIdx], ...op.payload };
               } else {
                  mergedItems.push(op.payload);
               }
            }
         });
         
         activeOrder.requirement_items = mergedItems;
      }
      
      setOrderData(activeOrder);
    } catch (e) {
      console.warn("Error fetching order details", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrderDetails();
    }, [orderId, session?.user?.id])
  );

  const isEditable = orderData?.status === 'New' || orderData?.status === 'Open' || orderData?.status === 'Draft';
  const orderRef = orderData?.demand_ref || orderId.substring(0,8).toUpperCase();
  const items = orderData?.requirement_items || [];

  let totalWeightKg = 0;
  let canCalculateWeight = true;

  if (items && items.length > 0) {
    items.forEach(item => {
      if (item.unit === 'Bags' && item.weight && item.quantity) {
        totalWeightKg += item.quantity * item.weight;
      } else if (item.unit === 'MT' && item.quantity) {
        totalWeightKg += item.quantity * 1000;
      } else {
        canCalculateWeight = false;
      }
    });
  } else {
    canCalculateWeight = false;
  }

  const handleWhatsAppShare = async () => {
    let customerMobile = orderData?.crm_parties?.mobile;
    const customerName = orderData?.crm_parties?.display_name || 'Customer';

    if (!customerMobile && orderData?.party_id) {
       try {
         const { data } = await supabase.from('crm_parties').select('mobile').eq('id', orderData.party_id).single();
         if (data && data.mobile) {
            customerMobile = data.mobile;
         }
       } catch (err) {
         console.warn("Failed to fetch customer mobile for WhatsApp", err);
       }
    }

    if (!customerMobile) {
      Alert.alert('No Mobile Number', 'Customer does not have a registered mobile number for WhatsApp.');
      return;
    }

    let message = `*Shubh Labh Order Confirmation*\n\n`;
    message += `*Customer:* ${customerName}\n`;
    message += `*Order Number:* ${orderRef}\n`;
    message += `*Date:* ${orderData?.created_at ? formatDateFull(orderData.created_at) : 'Unknown'}\n\n`;
    message += `*Products:*\n`;

    items.forEach(item => {
      message += `\n*${item.category || 'Product'}*\n`;
      message += `${item.product_name}\n`;
      if (item.unit === 'Bags' && item.weight) {
        message += `${item.weight} kg × ${item.quantity} Bags\n`;
        message += `Total: ${(item.weight * item.quantity).toLocaleString()} kg\n`;
      } else {
        message += `${item.quantity} ${item.unit}\n`;
      }
    });

    if (canCalculateWeight && totalWeightKg > 0) {
      message += `\n*TOTAL ORDER WEIGHT*\n${totalWeightKg.toLocaleString()} kg\n`;
    }

    const url = `whatsapp://send?phone=${customerMobile.replace(/\D/g, '')}&text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp Not Installed', 'WhatsApp does not appear to be installed on this device.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to open WhatsApp.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{orderRef}</Text>
      </View>

      {loading && !orderData ? (
         <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <ActivityIndicator size="large" color={colors.primary} />
         </View>
      ) : (
      <>
        <ScrollView contentContainerStyle={styles.container}>
        <OrderSummaryView 
          orderIdShort={orderRef}
          orderDate={orderData?.created_at ? formatDateFull(orderData.created_at).split(', ')[0] : 'Unknown'}
          orderTime={orderData?.created_at ? formatDateFull(orderData.created_at).split(', ')[1] : ''}
          customerName={orderData?.crm_parties?.display_name || 'Customer'}
          requirementItems={items}
          totalWeightKg={totalWeightKg}
          canCalculateWeight={canCalculateWeight}
        />

        <View style={styles.section}>
          <View style={[styles.metaRow, {marginBottom: 0}]}>
            <Text style={styles.metaLabel}>Order Status:</Text>
            <Text style={[styles.metaValue, {color: colors.primary, fontWeight: 'bold'}]}>
               {orderData?.status || 'New'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.whatsappBtn} 
          onPress={handleWhatsAppShare}
        >
          <MaterialIcons name="chat" size={20} color="#fff" />
          <Text style={styles.whatsappBtnText}>Share on WhatsApp</Text>
        </TouchableOpacity>

        {isEditable && (
          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => navigation.navigate('QuickRequirement', { 
              existingOrder: orderData,
              customerName: orderData?.crm_parties?.display_name,
              customerId: orderData?.party_id
            })}
          >
            <MaterialIcons name="edit" size={20} color={colors.onPrimary} />
            <Text style={styles.editBtnText}>EDIT ORDER</Text>
          </TouchableOpacity>
        )}
      </View>
      </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#ffffff', elevation: 2 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontWeight: 'bold', marginLeft: 8 },
  container: { padding: 16, paddingBottom: 100 },
  section: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, elevation: 1, marginBottom: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  metaValue: { ...typography.bodyMd, color: colors.onSurface },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#ffffff', elevation: 8, borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  editBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 24, gap: 8 },
  editBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: 'bold' },
  whatsappBtn: { backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 24, gap: 8, marginBottom: 12 },
  whatsappBtnText: { ...typography.labelLg, color: '#ffffff', fontWeight: 'bold' }
});
