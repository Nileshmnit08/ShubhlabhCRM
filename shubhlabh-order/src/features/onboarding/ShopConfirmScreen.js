import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useOnboarding } from './OnboardingContext';
import { useNavigation } from '@react-navigation/native';

export default function ShopConfirmScreen() {
  const { userProfile, customerProfile } = useAuth();
  const { updateData } = useOnboarding();
  const navigation = useNavigation();
  const [isWrongShop, setIsWrongShop] = useState(false);

  const handleConfirm = () => {
    updateData({ shopConfirmed: true });
    navigation.navigate('ShopLocation');
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Sampark Karein',
      'Shubh Labh support ko call ya WhatsApp karein.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL('tel:+919999999999') }
      ]
    );
  };

  if (isWrongShop) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorHeading}>SHOP KI JANKARI GALAT HAI?</Text>
        <Text style={styles.errorSub}>Kripya Shubh Labh se sampark karein.</Text>
        <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
          <Text style={styles.contactButtonText}>CALL SHUBH LABH</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.whatsappButton} onPress={handleContactSupport}>
          <Text style={styles.whatsappButtonText}>WHATSAPP</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => setIsWrongShop(false)}>
          <Text style={styles.backButtonText}>WAAPAS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>KYA YE AAPKI SHOP HAI?</Text>
      
      <View style={styles.card}>
        <Text style={styles.icon}>🏪</Text>
        <Text style={styles.shopName}>{customerProfile?.shop_name || 'No Shop Name'}</Text>
        <Text style={styles.buyerName}>{userProfile?.display_name || customerProfile?.name || 'No Name'}</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
        <Text style={styles.primaryButtonText}>HAAN, MERI SHOP HAI</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsWrongShop(true)}>
        <Text style={styles.secondaryButtonText}>NAHI, GALAT HAI</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  buyerName: {
    fontSize: 18,
    color: '#4B5563',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#F97316',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorHeading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorSub: {
    fontSize: 18,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 32,
  },
  contactButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  whatsappButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
