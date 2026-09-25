import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme/tokens';

export function OrderSummaryView({ orderIdShort, orderDate, orderTime, customerName, requirementItems, totalWeightKg, canCalculateWeight }) {
  return (
    <View style={styles.detailsCard}>
      <Text style={styles.orderConfirmTitle}>ORDER CONFIRMATION</Text>
      
      <View style={styles.metaBox}>
        <Text style={styles.detailLabel}>Order ID: <Text style={styles.detailValue}>{orderIdShort}</Text></Text>
        <Text style={styles.detailLabel}>Date: <Text style={styles.detailValue}>{orderDate} {orderTime}</Text></Text>
      </View>
      
      <Text style={styles.prominentCustomer}>{customerName}</Text>

      <View style={styles.divider} />
      <Text style={[styles.detailLabel, { marginBottom: 8, letterSpacing: 0.5 }]}>PRODUCTS</Text>
      {requirementItems && requirementItems.map((item, idx) => (
        <View key={idx} style={styles.productRow}>
          <Text style={styles.itemCategory}>{item.category || 'Product'}</Text>
          <Text style={styles.itemProductName}>{item.product_name}</Text>
          {item.unit === 'Bags' && item.weight ? (
            <Text style={styles.itemWeightCalc}>
              {item.weight} kg × {item.quantity} Bags{'\n'}
              <Text style={styles.itemLineTotal}>Total: {(item.weight * item.quantity).toLocaleString()} kg</Text>
            </Text>
          ) : (
            <Text style={styles.itemWeightCalc}>{item.quantity} {item.unit}</Text>
          )}
        </View>
      ))}

      {canCalculateWeight && totalWeightKg > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.totalWeightLabel}>TOTAL ORDER WEIGHT</Text>
            <Text style={styles.totalWeightValue}>{totalWeightKg.toLocaleString()} kg</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  detailsCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 16, elevation: 1, marginBottom: 24 },
  orderConfirmTitle: { ...typography.titleMd, fontWeight: 'bold', color: colors.onSurface, marginBottom: 16, textAlign: 'center' },
  metaBox: { marginBottom: 16 },
  prominentCustomer: { ...typography.headlineSm, fontWeight: 'bold', color: colors.primary, marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: 4 },
  detailValue: { ...typography.bodyMd, fontWeight: 'bold', color: colors.onSurface },
  divider: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: 12 },
  productRow: { marginBottom: 12, paddingLeft: 8 },
  itemCategory: { ...typography.bodyMd, fontWeight: 'bold', color: colors.onSurface, marginBottom: 2 },
  itemProductName: { ...typography.bodyMd, color: colors.onSurface, marginBottom: 2 },
  itemWeightCalc: { ...typography.bodySm, color: colors.onSurfaceVariant },
  itemLineTotal: { ...typography.bodySm, fontWeight: 'bold', color: colors.onSurface },
  totalWeightLabel: { ...typography.labelLg, fontWeight: 'bold', color: colors.primary },
  totalWeightValue: { ...typography.labelLg, fontWeight: 'bold', color: colors.primary },
});
