import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useOnboarding } from './OnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../shared/localization/i18n';
import SLButton from '../../shared/components/SLButton';
import SLCard from '../../shared/components/SLCard';

export default function DeliveryLocationScreen() {
  const { onboardingData, updateData } = useOnboarding();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [selectedSame, setSelectedSame] = useState(false);

  const handleSameShop = () => {
    setSelectedSame(true);
  };

  const handleConfirmSame = () => {
    updateData({ 
      deliveryType: 'SAME', 
      deliveryAddress: onboardingData.shopLocation 
    });
    navigation.navigate('ShopPhoto');
  };

  const handleDifferent = () => {
    updateData({ deliveryType: 'DIFFERENT' });
    navigation.navigate('DeliveryAddress');
  };

  if (selectedSame) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>{t('onboarding.deliveryAddress')}</Text>
        <SLCard style={styles.card}>
          <Text style={styles.cardText}>{onboardingData.shopLocation?.address}</Text>
        </SLCard>
        <SLButton title={t('common.confirm')} onPress={handleConfirmSame} />
        <View style={{ height: 16 }} />
        <SLButton title={t('common.cancel')} variant="secondary" onPress={() => setSelectedSame(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('onboarding.deliveryAddress')}</Text>
      
      <TouchableOpacity style={styles.largeOption} onPress={handleSameShop}>
        <Text style={styles.optionIcon}>🏪</Text>
        <Text style={styles.optionText}>Same as Shop Location</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.largeOption} onPress={handleDifferent}>
        <Text style={styles.optionIcon}>📍</Text>
        <Text style={styles.optionText}>Separate Delivery Address</Text>
      </TouchableOpacity>
      
      <View style={{ height: 16 }} />
      <SLButton title={t('common.cancel')} variant="secondary" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFDF8' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#202124', textAlign: 'center', marginBottom: 40 },
  largeOption: { backgroundColor: '#F3F4F6', padding: 32, borderRadius: 16, alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#E5E7EB' },
  optionIcon: { fontSize: 48, marginBottom: 16 },
  optionText: { fontSize: 20, fontWeight: 'bold', color: '#202124' },
  card: { padding: 24, marginBottom: 32, alignItems: 'center' },
  cardText: { fontSize: 18, color: '#202124', textAlign: 'center' }
});
