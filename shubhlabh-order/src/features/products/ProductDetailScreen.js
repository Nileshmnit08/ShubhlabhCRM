import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { SLButton } from '../../shared/components/SLButton';
import { useTranslation } from '../../shared/localization/i18n';
import { useOrderList } from '../orders/OrderListContext';
import { Plus, Minus } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const { t } = useTranslation();
  const { addToOrderList } = useOrderList();
  const [qty, setQty] = useState(1);

  const handleAdd = () => {
    addToOrderList(product, qty);
    setQty(1);
    Alert.alert(t('common.confirm'), t('order.confirmed'));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader title={product.name} navigation={navigation} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imagePlaceholder}>
          <Text style={{ color: theme.colors.disabled }}>Product Image</Text>
        </View>

        <Text style={styles.productName}>{product.name}</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('product.packSize')}:</Text>
          <Text style={styles.value}>{product.unit_of_measure || '1 Bag'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>{t('product.price')}:</Text>
          <Text style={styles.priceValue}>₹{product.price || '0'}</Text>
        </View>
        {product.scheme && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('product.scheme')}:</Text>
            <Text style={styles.schemeValue}>{product.scheme}</Text>
          </View>
        )}

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>{t('product.keyBenefits')}</Text>
          <Text style={styles.benefitsText}>{product.description || 'No description available.'}</Text>
        </View>

      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.qtyContainer}>
          <TouchableOpacity onPress={() => setQty(Math.max(1, qty - 1))} style={styles.qtyBtn}>
            <Minus size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{qty}</Text>
          <TouchableOpacity onPress={() => setQty(qty + 1)} style={styles.qtyBtn}>
            <Plus size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <SLButton 
          title={t('product.addToOrder')} 
          onPress={handleAdd} 
          style={styles.addBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 100 },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  productName: { ...theme.typography.h1, marginBottom: theme.spacing.lg },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md, paddingBottom: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  label: { ...theme.typography.bodyLarge, color: theme.colors.textSecondary },
  value: { ...theme.typography.bodyLarge, fontWeight: '600' },
  priceValue: { ...theme.typography.bodyLarge, fontWeight: '700', color: theme.colors.text },
  schemeValue: { ...theme.typography.bodyLarge, fontWeight: '600', color: theme.colors.green },
  benefitsSection: { marginTop: theme.spacing.lg },
  benefitsTitle: { ...theme.typography.h3, marginBottom: theme.spacing.md },
  benefitsText: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary, lineHeight: 22 },
  
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.elevation.md,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.md,
  },
  qtyBtn: { padding: theme.spacing.md },
  qtyText: { ...theme.typography.h3, minWidth: 32, textAlign: 'center' },
  addBtn: { flex: 1 },
});
