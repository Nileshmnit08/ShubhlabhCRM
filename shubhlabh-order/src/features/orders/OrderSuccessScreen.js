import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, BackHandler } from 'react-native';
import { theme } from '../../shared/theme';
import { SLButton } from '../../shared/components/SLButton';
import { SLHeader } from '../../shared/components/SLHeader';
import { useTranslation } from '../../shared/localization/i18n';
import { CheckCircle } from 'lucide-react-native';
import { leaveOrderSuccess, SUCCESS_EXITS } from '../../navigation/orderNavigation';

export default function OrderSuccessScreen({ route, navigation }) {
  const { t } = useTranslation();
  const orderData = route.params?.orderData;

  // Every way out of this screen removes the finished New Order flow from the stack (pop to the original
  // MainTabs), so no Back press — button, hardware key or gesture — can return to Review / Success.
  const navigateToSafeDestination = () => leaveOrderSuccess(navigation, SUCCESS_EXITS.ORDERS);

  useEffect(() => {
    const onHardwareBack = () => {
      navigateToSafeDestination();
      return true; // prevent default pop back to OrderReview
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader
        title={orderData?.updated ? 'Order Updated' : (t('order.confirmed') || 'Order Confirmed')}
        showBack={true}
        onBackPress={navigateToSafeDestination}
      />
      <View style={styles.container}>
        <CheckCircle size={80} color={theme.colors.green} style={styles.icon} />
        
        <Text style={styles.title}>{orderData?.updated ? 'Order Updated' : t('order.confirmed')}</Text>
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
            onPress={() => leaveOrderSuccess(navigation, SUCCESS_EXITS.DETAIL, orderData?.id)}
            style={styles.btn}
          />
          <SLButton 
            title={t('profile.language') === 'Language' ? 'My Orders' : 'मेरे ऑर्डर'} 
            variant="outline" 
            onPress={navigateToSafeDestination}
            style={styles.btn}
          />
          <SLButton 
            title={t('common.backToHome')} 
            variant="secondary" 
            onPress={() => leaveOrderSuccess(navigation, SUCCESS_EXITS.HOME)}
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
