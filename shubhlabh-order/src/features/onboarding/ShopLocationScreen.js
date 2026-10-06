import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useOnboarding } from './OnboardingContext';
import { useNavigation } from '@react-navigation/native';

export default function ShopLocationScreen() {
  const { updateData } = useOnboarding();
  const navigation = useNavigation();
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
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.subtext}>Location li jaa rahi hai...</Text>
        </View>
      );
    }

    if (locationStatus === 'success') {
      return (
        <View style={styles.center}>
          <Text style={styles.subtext}>SHOP LOCATION</Text>
          <Text style={styles.addressText}>{locationDetails?.address}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
            <Text style={styles.primaryButtonText}>LOCATION CONFIRM KAREIN</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (locationStatus === 'denied') {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>Location permission nahi mili.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestLocation}>
            <Text style={styles.primaryButtonText}>DOBARA TRY KAREIN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenSettings}>
            <Text style={styles.secondaryButtonText}>PHONE SETTINGS KHOLEN</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (locationStatus === 'error') {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>Location nahi mil rahi.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestLocation}>
            <Text style={styles.primaryButtonText}>DOBARA TRY KAREIN</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // first_request
    return (
      <View style={styles.center}>
        <Text style={styles.subtext}>Shop ki location lene ke liye location permission chahiye.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestLocation}>
          <Text style={styles.primaryButtonText}>📍 LOCATION KI IJAZAT DEIN</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>AAPKI SHOP KAHAN HAI?</Text>
      {renderContent()}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>WAAPAS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  center: { alignItems: 'center' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', marginBottom: 32 },
  subtext: { fontSize: 18, color: '#4B5563', textAlign: 'center', marginBottom: 24 },
  addressText: { fontSize: 20, fontWeight: '500', color: '#111827', textAlign: 'center', marginBottom: 32, backgroundColor: '#F3F4F6', padding: 16, borderRadius: 8, width: '100%' },
  errorText: { fontSize: 18, color: '#DC2626', textAlign: 'center', marginBottom: 24 },
  primaryButton: { backgroundColor: '#F97316', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16, width: '100%' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, alignItems: 'center', width: '100%' },
  secondaryButtonText: { color: '#4B5563', fontSize: 18, fontWeight: 'bold' },
  backButton: { marginTop: 32, padding: 16, alignItems: 'center' },
  backButtonText: { color: '#6B7280', fontSize: 16, fontWeight: 'bold' }
});
