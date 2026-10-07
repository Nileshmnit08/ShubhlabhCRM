import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../../shared/theme';
import { useTranslation } from '../../shared/localization/i18n';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../core/api/supabase';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';

export default function OrderReviewScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { customerProfile } = useAuth();
  const { finalItems, existingOrder } = route.params;
  const [loading, setLoading] = React.useState(false);

  const handlePlaceOrder = async () => {
    if (!customerProfile?.id) {
      Alert.alert('Error', 'Buyer profile not found.');
      return;
    }

    // Validate all items have a real product_id from the database.
    // Items selected from fallback/default list have product_id = null,
    // which causes a NOT NULL violation in buyer_order_items.
    const invalidItems = finalItems.filter(item => !item.product_id);
    if (invalidItems.length > 0) {
      const names = invalidItems.map(i => i.product_name).join(', ');
      Alert.alert(
        t('common.error') || 'Error',
        `Product not found in database: ${names}. Please select a product from the live catalogue.`
      );
      return;
    }

    if (finalItems.length === 0) {
      Alert.alert(t('common.error') || 'Error', 'No items in order.');
      return;
    }
    
    setLoading(true);
    try {
      // Generate idempotency key
      const clientRef = 'ref-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
      
      // Build extras map for weight/gift per product
      const itemExtras = {};
      for (const item of finalItems) {
        // Use category + product_name to distinguish duplicate names across categories
        const key = `${item.category}_${item.product_name}`;
        itemExtras[key] = { 
          gift: item.gift || null, 
          other_gift: item.other_gift || null, 
          weight: item.weight || null, 
          unit: item.unit || 'Bags',
        };
      }

      const reqPayload = {
        party_id: customerProfile.id,
        status: 'New', // Must match req_status_check constraint
        unit: 'Bags',  // Must satisfy NOT NULL constraint on requirements
        notes: JSON.stringify({
          address: customerProfile?.city || 'Saved Address',
          client_reference_id: clientRef,
          extras: itemExtras,
        })
      };

      console.log('Placing order with payload:', JSON.stringify(reqPayload));

      // 1. Insert Header
      const { data: reqData, error: reqError } = await supabase
        .from('requirements')
        .insert(reqPayload)
        .select()
        .single();
        
      if (reqError) {
        console.error('Error inserting requirement:', reqError);
        throw new Error(reqError.message || 'Error inserting order');
      }
      if (!reqData) throw new Error('Order placement did not return data');
      
      // 2. Insert Lines
      const itemsPayload = finalItems.map(item => ({
        requirement_id: reqData.id,
        product_name: item.product_name,
        category: item.category || 'Uncategorized',
        quantity: item.quantity,
        unit: item.unit || 'Bags'
      }));
      
      const { error: itemsError } = await supabase
        .from('requirement_items')
        .insert(itemsPayload);
        
      if (itemsError) {
         console.error('Error inserting requirement items:', itemsError);
         throw new Error(itemsError.message || 'Error inserting order items');
      }

      const orderData = {
        id: reqData.id,
        order_no: reqData.demand_ref || 'PENDING',
        final_amount: 0,
        status: reqData.status || 'Order Lag Gaya',
      };
      
      // Navigate to Success
      navigation.navigate('OrderSuccess', { orderData });
    } catch (error) {
      console.error('Place order error:', error);
      const msg = error?.message || 'Failed to place order.';
      Alert.alert(
        t('common.error') || 'An error occurred',
        msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.language') === 'Language' ? 'Review Order' : 'ऑर्डर की समीक्षा'}</Text>
        <View style={{ width: 28 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
           {finalItems.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.itemTitle}>{item.product_name}</Text>
                  <Text style={styles.itemSub}>{item.quantity} {item.unit || 'Bags'} {item.weight ? `• ${item.weight} KG` : ''}</Text>
                  {item.gift && (
                    <Text style={styles.itemGift}>Gift: {item.gift === 'Others' ? item.other_gift : item.gift}</Text>
                  )}
                </View>
              </View>
           ))}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handlePlaceOrder} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <CheckCircle size={22} color={theme.colors.white} />
              <Text style={styles.saveBtnText}>{t('profile.language') === 'Language' ? 'Place Order' : 'ऑर्डर करें'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.textPrimary },
  backButton: { padding: 8, marginLeft: -8 },
  content: { padding: 16 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textPrimary },
  itemSub: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  itemGift: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  footer: { padding: 16, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  saveBtn: { height: 56, backgroundColor: theme.colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: theme.colors.white, textTransform: 'uppercase' },
});
