import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { theme } from '../../shared/theme';
import { SLButton } from '../../shared/components/SLButton';
import { useTranslation } from '../../shared/localization/i18n';
import { CheckCircle } from 'lucide-react-native';

export default function OrderSuccessScreen({ route, navigation }) {
  const { t } = useTranslation();
  const orderData = route.params?.orderData;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <CheckCircle size={80} color={theme.colors.green} style={styles.icon} />
        
        <Text style={styles.title}>{t('order.confirmed')}</Text>
        <Text style={styles.subtitle}>{t('order.number')}: {orderData?.order_no || 'Pending'}</Text>
        
        <View style={styles.detailsBox}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('order.total')}:</Text>
            <Text style={styles.value}>{orderData?.final_amount ? `₹${orderData.final_amount}` : 'TBD'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('order.expectedDispatch')}:</Text>
            <Text style={styles.value}>Tomorrow, 10:00 AM</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <SLButton 
            title={t('order.viewOrder')} 
            onPress={() => {
              navigation.navigate('NewOrderMain');
              navigation.navigate('OrdersStack', { screen: 'OrderDetail', params: { orderId: orderData?.id, order: orderData } });
            }} 
            style={styles.btn}
          />
          <SLButton 
            title={t('profile.language') === 'Language' ? 'My Orders' : 'मेरे ऑर्डर'} 
            variant="outline" 
            onPress={() => {
              navigation.navigate('NewOrderMain');
              navigation.navigate('OrdersStack', { screen: 'MyOrders' });
            }} 
            style={styles.btn}
          />
          <SLButton 
            title={t('common.backToHome')} 
            variant="secondary" 
            onPress={() => {
              navigation.navigate('NewOrderMain');
              navigation.navigate('HomeTab');
            }} 
            style={styles.btn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.xl, alignItems: 'center', justifyContent: 'center' },
  icon: { marginBottom: theme.spacing.lg },
  title: { ...theme.typography.h1, color: theme.colors.green, marginBottom: theme.spacing.xs, textAlign: 'center' },
  subtitle: { ...theme.typography.bodyLarge, color: theme.colors.textSecondary, marginBottom: theme.spacing.xl },
  detailsBox: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl * 1.5,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  label: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary },
  value: { ...theme.typography.bodyMedium, fontWeight: '600' },
  actions: { width: '100%' },
  btn: { marginBottom: theme.spacing.md },
});
