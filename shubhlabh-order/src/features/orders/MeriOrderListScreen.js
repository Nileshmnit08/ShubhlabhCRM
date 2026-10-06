import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useOrderList } from './OrderListContext';
import { SLHeader } from '../../shared/components/SLHeader';
import { SLButton } from '../../shared/components/SLButton';
import { SLCard } from '../../shared/components/SLCard';
import { theme } from '../../shared/theme';
import { useTranslation } from '../../shared/localization/i18n';
import { Minus, Plus, Trash2 } from 'lucide-react-native';

export default function MeriOrderListScreen({ navigation }) {
  const { t } = useTranslation();
  const { orderList, updateQuantity, removeFromOrderList, totalAmount, totalBags, clearOrderList } = useOrderList();

  const handleConfirm = () => {
    if (orderList.length === 0) return;
    Alert.alert(t('common.confirm'), t('order.readyConfirm'));
  };

  const renderItem = ({ item }) => (
    <SLCard style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <TouchableOpacity onPress={() => removeFromOrderList(item.product.id)}>
          <Trash2 size={20} color={theme.colors.alert} />
        </TouchableOpacity>
      </View>
      <Text style={styles.itemPrice}>₹{item.product.price} / bag</Text>
      
      <View style={styles.actionRow}>
        <Text style={styles.itemTotal}>₹{item.product.price * item.quantity}</Text>
        <View style={styles.qtyContainer}>
          <TouchableOpacity onPress={() => updateQuantity(item.product.id, -1)} style={styles.qtyBtn}>
            <Minus size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => updateQuantity(item.product.id, 1)} style={styles.qtyBtn}>
            <Plus size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </SLCard>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader title={t('order.meriOrderList')} navigation={navigation} />
      
      {orderList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('order.emptyList')}</Text>
          <SLButton 
            title={t('order.browseProducts')} 
            onPress={() => navigation.navigate('ProductsTab')} 
            style={{ marginTop: theme.spacing.xl }} 
          />
        </View>
      ) : (
        <>
          <FlatList
            data={orderList}
            keyExtractor={item => item.product.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
          
          <View style={styles.summaryBar}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('order.totalProducts')}:</Text>
              <Text style={styles.summaryValue}>{orderList.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('order.totalBags')}:</Text>
              <Text style={styles.summaryValue}>{totalBags}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('order.subtotal')}:</Text>
              <Text style={styles.summaryValue}>₹{totalAmount}</Text>
            </View>
            {/* Mock Scheme Benefit Calculation */}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.colors.green }]}>{t('order.schemeBenefit')}:</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.green }]}>- ₹0</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelTotal}>{t('order.grandTotal')}:</Text>
              <Text style={styles.summaryValueTotal}>₹{totalAmount}</Text>
            </View>
            <SLButton 
              title={t('order.confirmOrder')} 
              onPress={handleConfirm} 
              style={styles.confirmBtn}
            />
            <SLButton 
              title={t('order.continueShopping')} 
              variant="secondary"
              onPress={() => navigation.navigate('ProductsTab')} 
              style={styles.continueBtn}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { padding: theme.spacing.md },
  itemCard: { padding: theme.spacing.md },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { ...theme.typography.h3, flex: 1, marginRight: theme.spacing.sm },
  itemPrice: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary, marginTop: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.md },
  itemTotal: { ...theme.typography.h3, color: theme.colors.primary },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
  },
  qtyBtn: { padding: theme.spacing.xs + 2 },
  qtyText: { ...theme.typography.bodyLarge, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  
  summaryBar: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.elevation.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  summaryLabel: { ...theme.typography.bodyLarge, color: theme.colors.textSecondary },
  summaryValue: { ...theme.typography.bodyLarge, fontWeight: '600' },
  summaryLabelTotal: { ...theme.typography.h2 },
  summaryValueTotal: { ...theme.typography.h2, color: theme.colors.primary },
  confirmBtn: { marginTop: theme.spacing.md },
  continueBtn: { marginTop: theme.spacing.sm },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  emptyText: { ...theme.typography.bodyLarge, color: theme.colors.textSecondary },
});
