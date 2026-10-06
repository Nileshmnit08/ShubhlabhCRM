import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useOnboarding } from './OnboardingContext';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../core/api/supabase';

export default function FinalConfirmationScreen() {
  const { onboardingData } = useOnboarding();
  const { customerProfile, logout } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(false);

    try {
      // Since Buyer cannot UPDATE crm_parties directly (RLS), we store onboarding state 
      // securely in the authorized app_users.raw_user_meta_data.
      const payload = {
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        shopLocation: onboardingData.shopLocation,
        deliveryType: onboardingData.deliveryType,
        deliveryAddress: onboardingData.deliveryAddress,
        shopPhoto: onboardingData.shopPhoto // in a real app, this would be uploaded to storage and URL saved
      };

      const { error } = await supabase.auth.updateUser({
        data: payload
      });

      if (error) {
        throw error;
      }

      // Success - force reload the app or state to go to Home
      Alert.alert('Success', 'Onboarding Complete!', [
        { text: 'OK', onPress: () => {
           // We can just trigger a refresh of the auth state, or just reload customer profile
           // As a simple hack, we call logout to restart flow, or reload app
           logout();
        }}
      ]);
    } catch (err) {
      console.error(err);
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (saveError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorHeading}>JANKARI SAVE NAHI HO PAAYI</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>DOBARA TRY KAREIN</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.heading}>SAB THIK HAI?</Text>
      
      <View style={styles.summaryCard}>
        <Text style={styles.label}>SHOP</Text>
        <Text style={styles.value}>{customerProfile?.shop_name}</Text>
        
        <Text style={styles.label}>SHOP LOCATION</Text>
        <Text style={styles.value}>{onboardingData.shopLocation?.address}</Text>

        <Text style={styles.label}>DELIVERY LOCATION</Text>
        <Text style={styles.value}>{onboardingData.deliveryAddress?.address}</Text>

        <Text style={styles.label}>SHOP PHOTO</Text>
        {onboardingData.shopPhoto ? (
          <Image source={{ uri: onboardingData.shopPhoto }} style={styles.thumbnail} />
        ) : (
          <Text style={styles.value}>Nahi Hai</Text>
        )}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={isSaving}>
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>SAB THIK HAI — HOME PAR JAYEIN</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => {}} disabled={isSaving}>
        <Text style={styles.secondaryButtonText}>BADLEIN</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', marginBottom: 24 },
  errorHeading: { fontSize: 24, fontWeight: 'bold', color: '#DC2626', textAlign: 'center', marginBottom: 24 },
  summaryCard: { backgroundColor: '#F3F4F6', padding: 20, borderRadius: 12, marginBottom: 32 },
  label: { fontSize: 14, color: '#6B7280', fontWeight: 'bold', marginBottom: 4, marginTop: 12 },
  value: { fontSize: 18, color: '#111827', fontWeight: '500' },
  thumbnail: { width: '100%', height: 150, borderRadius: 8, marginTop: 8, resizeMode: 'cover' },
  primaryButton: { backgroundColor: '#F97316', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#4B5563', fontSize: 16, fontWeight: 'bold' }
});
