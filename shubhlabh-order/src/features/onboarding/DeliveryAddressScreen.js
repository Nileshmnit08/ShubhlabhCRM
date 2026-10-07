import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { useOnboarding } from './OnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../shared/localization/i18n';
import SLButton from '../../shared/components/SLButton';
import SLCard from '../../shared/components/SLCard';

export default function DeliveryAddressScreen() {
  const { updateData } = useOnboarding();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleCaptureLocation = async () => {
    setIsCapturing(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission denied.', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: 'Settings', onPress: () => Linking.openSettings() }
      ]);
      setIsCapturing(false);
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (geocode && geocode.length > 0) {
        const addr = geocode[0];
        setAddress([addr.street, addr.city, addr.region].filter(Boolean).join(', '));
        setVillage(addr.name || '');
      }

      setCapturedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
    } catch (error) {
      Alert.alert('Error', t('common.error'));
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = () => {
    if (!address) {
      Alert.alert('Error', 'Please enter address.');
      return;
    }
    setIsConfirming(true);
  };

  const handleConfirm = () => {
    const deliveryData = {
      address: `${village ? village + ', ' : ''}${address}`,
      ...(capturedLocation || {})
    };
    updateData({ deliveryAddress: deliveryData });
    navigation.navigate('ShopPhoto');
  };

  if (isConfirming) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>{t('onboarding.confirmDetails')}</Text>
        <SLCard style={styles.card}>
          <Text style={styles.icon}>🏠</Text>
          <Text style={styles.cardText}>{village ? village + ', ' : ''}{address}</Text>
        </SLCard>
        <SLButton title="Continue" onPress={handleConfirm} />
        <View style={{ height: 16 }} />
        <SLButton title={t('common.cancel')} variant="secondary" onPress={() => setIsConfirming(false)} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.heading}>{t('onboarding.deliveryAddress')}</Text>
      
      <SLButton 
        title={isCapturing ? t('common.loading') : '📍 Capture Location'} 
        onPress={handleCaptureLocation} 
        disabled={isCapturing}
        variant="secondary"
        style={{ marginBottom: 32 }}
      />

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address / Locality</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Street, locality, etc."
          placeholderTextColor="#9AA0A6"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Village / Town</Text>
        <TextInput
          style={styles.input}
          value={village}
          onChangeText={setVillage}
          placeholder="City or Town"
          placeholderTextColor="#9AA0A6"
        />
      </View>

      <SLButton title="Continue" onPress={handleSubmit} style={{ marginTop: 16 }} />
      <View style={{ height: 16 }} />
      <SLButton title={t('common.cancel')} variant="secondary" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFDF8' },
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFDF8' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#202124', textAlign: 'center', marginBottom: 24 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 16, color: '#1A4B8C', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E8EAED', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#FFFFFF', color: '#202124' },
  card: { padding: 24, marginBottom: 32, alignItems: 'center' },
  cardText: { fontSize: 18, color: '#202124', textAlign: 'center' },
  icon: { fontSize: 32, marginBottom: 8 }
});
