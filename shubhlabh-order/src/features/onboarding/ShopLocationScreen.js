import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useOnboarding } from './OnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../shared/localization/i18n';
import SLButton from '../../shared/components/SLButton';
import SLCard from '../../shared/components/SLCard';

export default function ShopLocationScreen() {
  const { updateData } = useOnboarding();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [locationStatus, setLocationStatus] = useState('first_request'); // 'first_request', 'loading', 'success', 'denied', 'error'
  const [locationDetails, setLocationDetails] = useState(null);

  const requestLocation = async () => {
    setLocationStatus('loading');
    
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationStatus('denied');
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      let addressStr = "Location captured";
      if (geocode && geocode.length > 0) {
        const addr = geocode[0];
        addressStr = [addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', ');
      }
      
      const locData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        address: addressStr
      };

      setLocationDetails(locData);
      setLocationStatus('success');
    } catch (error) {
      console.error(error);
      setLocationStatus('error');
    }
  };

  const handleConfirm = () => {
    if (locationDetails) {
      updateData({ shopLocation: locationDetails });
      navigation.navigate('DeliveryLocation');
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const renderContent = () => {
    if (locationStatus === 'loading') {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F28C28" />
          <Text style={styles.subtext}>{t('common.loading')}</Text>
        </View>
      );
    }

    if (locationStatus === 'success') {
      return (
        <View style={styles.center}>
          <Text style={styles.subtext}>{t('onboarding.shopLocation')}</Text>
          <SLCard style={styles.addressCard}>
            <Text style={styles.addressText}>{locationDetails?.address}</Text>
          </SLCard>
          <SLButton title="Continue" onPress={handleConfirm} style={{width: '100%'}} />
        </View>
      );
    }

    if (locationStatus === 'denied') {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>Permission Denied</Text>
          <SLButton title={t('common.retry')} onPress={requestLocation} style={{width: '100%', marginBottom: 16}} />
          <SLButton title="Settings" variant="secondary" onPress={handleOpenSettings} style={{width: '100%'}} />
        </View>
      );
    }

    if (locationStatus === 'error') {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <SLButton title={t('common.retry')} onPress={requestLocation} style={{width: '100%'}} />
        </View>
      );
    }

    // first_request
    return (
      <View style={styles.center}>
        <Text style={styles.subtext}>Location required.</Text>
        <SLButton title="📍 Location" onPress={requestLocation} style={{width: '100%'}} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('onboarding.shopLocation')}</Text>
      {renderContent()}
      <View style={{ height: 32 }} />
      <SLButton title={t('common.cancel')} variant="secondary" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFDF8' },
  center: { alignItems: 'center', width: '100%' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#202124', textAlign: 'center', marginBottom: 32 },
  subtext: { fontSize: 18, color: '#1A4B8C', textAlign: 'center', marginBottom: 24 },
  addressCard: { width: '100%', padding: 16, marginBottom: 32 },
  addressText: { fontSize: 20, fontWeight: '500', color: '#202124', textAlign: 'center' },
  errorText: { fontSize: 18, color: '#D93025', textAlign: 'center', marginBottom: 24 }
});
