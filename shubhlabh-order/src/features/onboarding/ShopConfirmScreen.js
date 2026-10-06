import React, { useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useOnboarding } from './OnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../shared/localization/i18n';
import SLButton from '../../shared/components/SLButton';
import SLCard from '../../shared/components/SLCard';

export default function ShopConfirmScreen() {
  const { userProfile, customerProfile } = useAuth();
  const { updateData } = useOnboarding();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [isWrongShop, setIsWrongShop] = useState(false);

  const handleConfirm = () => {
    updateData({ shopConfirmed: true });
    navigation.navigate('ShopLocation');
  };

  const handleContactSupport = () => {
    Linking.openURL('tel:+919999999999');
  };

  if (isWrongShop) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorHeading}>{t('common.error')}</Text>
        <Text style={styles.errorSub}>{t('auth.support')}</Text>
        <SLButton title="CALL SHUBH LABH" onPress={handleContactSupport} />
        <View style={{ height: 16 }} />
        <SLButton title="WHATSAPP" variant="secondary" onPress={handleContactSupport} />
        <View style={{ height: 32 }} />
        <SLButton title={t('common.cancel')} variant="secondary" onPress={() => setIsWrongShop(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('onboarding.shopConfirm')}</Text>
      
      <SLCard style={styles.card}>
        <Text style={styles.icon}>🏪</Text>
        <Text style={styles.shopName}>{customerProfile?.display_name || customerProfile?.legal_or_core_name || 'No Shop Name'}</Text>
        <Text style={styles.buyerName}>{userProfile?.display_name || customerProfile?.mobile || 'No Name'}</Text>
      </SLCard>

      <SLButton title={t('common.confirm')} onPress={handleConfirm} />
      <View style={{ height: 16 }} />
      <SLButton title={t('common.cancel')} variant="secondary" onPress={() => setIsWrongShop(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#202124',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#202124',
    textAlign: 'center',
    marginBottom: 8,
  },
  buyerName: {
    fontSize: 18,
    color: '#1A4B8C',
    textAlign: 'center',
  },
  errorHeading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D93025',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorSub: {
    fontSize: 18,
    color: '#202124',
    textAlign: 'center',
    marginBottom: 32,
  }
});
