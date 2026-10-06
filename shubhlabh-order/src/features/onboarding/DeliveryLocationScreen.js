import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useOnboarding } from './OnboardingContext';
import { useNavigation } from '@react-navigation/native';

export default function DeliveryLocationScreen() {
  const { onboardingData, updateData } = useOnboarding();
  const navigation = useNavigation();
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
        <Text style={styles.heading}>MAAL YAHIN PAHUCHANA HAI?</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>{onboardingData.shopLocation?.address || 'Shop Location'}</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmSame}>
          <Text style={styles.primaryButtonText}>HAAN, YAHIN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setSelectedSame(false)}>
          <Text style={styles.secondaryButtonText}>BADLEIN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>MAAL KAHAN PAHUCHANA HAI?</Text>
      
      <TouchableOpacity style={styles.largeOption} onPress={handleSameShop}>
        <Text style={styles.optionIcon}>🏪</Text>
        <Text style={styles.optionText}>ISI SHOP PAR</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.largeOption} onPress={handleDifferent}>
        <Text style={styles.optionIcon}>📍</Text>
        <Text style={styles.optionText}>DUSRE ADDRESS PAR</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>WAAPAS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', marginBottom: 40 },
  largeOption: { backgroundColor: '#F3F4F6', padding: 32, borderRadius: 16, alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#E5E7EB' },
  optionIcon: { fontSize: 48, marginBottom: 16 },
  optionText: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  card: { backgroundColor: '#F3F4F6', padding: 24, borderRadius: 12, marginBottom: 32, alignItems: 'center' },
  cardText: { fontSize: 18, color: '#111827', textAlign: 'center' },
  primaryButton: { backgroundColor: '#F97316', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#4B5563', fontSize: 18, fontWeight: 'bold' },
  backButton: { marginTop: 16, padding: 16, alignItems: 'center' },
  backButtonText: { color: '#6B7280', fontSize: 16, fontWeight: 'bold' }
});
