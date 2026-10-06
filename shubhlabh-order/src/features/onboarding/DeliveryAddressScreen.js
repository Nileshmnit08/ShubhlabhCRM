import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useOnboarding } from './OnboardingContext';
import { useNavigation } from '@react-navigation/native';

export default function DeliveryAddressScreen() {
  const { updateData } = useOnboarding();
  const navigation = useNavigation();
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleCaptureLocation = async () => {
    setIsCapturing(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission nahi mili. Phone settings check karein.', [
        { text: 'Cancel', style: 'cancel' },
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
      Alert.alert('Error', 'Location nahi mil rahi. Khud se type karein.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = () => {
    if (!address) {
      Alert.alert('Error', 'Pura address daalein.');
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
        <Text style={styles.heading}>MAAL YAHAN PAHUCHANA HAI?</Text>
        <View style={styles.card}>
          <Text style={styles.icon}>🏠</Text>
          <Text style={styles.cardText}>{village ? village + ', ' : ''}{address}</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
          <Text style={styles.primaryButtonText}>HAAN, YAHIN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsConfirming(false)}>
          <Text style={styles.secondaryButtonText}>BADLEIN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>DUSRA ADDRESS</Text>
      
      <TouchableOpacity style={styles.locationButton} onPress={handleCaptureLocation} disabled={isCapturing}>
        {isCapturing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.locationButtonText}>📍 MERI LOCATION LEIN</Text>
        )}
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address / Locality</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Makaan No., Gali, etc."
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Village / Town</Text>
        <TextInput
          style={styles.input}
          value={village}
          onChangeText={setVillage}
          placeholder="Gaon ya Shehar"
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
        <Text style={styles.primaryButtonText}>AAGE BADEIN</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>WAAPAS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', marginBottom: 24 },
  locationButton: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 32 },
  locationButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 16, color: '#4B5563', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#F9FAFB' },
  primaryButton: { backgroundColor: '#F97316', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  secondaryButtonText: { color: '#4B5563', fontSize: 18, fontWeight: 'bold' },
  backButton: { marginTop: 16, padding: 16, alignItems: 'center' },
  backButtonText: { color: '#6B7280', fontSize: 16, fontWeight: 'bold' },
  card: { backgroundColor: '#F3F4F6', padding: 24, borderRadius: 12, marginBottom: 32, alignItems: 'center' },
  cardText: { fontSize: 18, color: '#111827', textAlign: 'center' },
  icon: { fontSize: 32, marginBottom: 8 }
});
