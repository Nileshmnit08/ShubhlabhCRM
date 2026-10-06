import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import { useOnboarding } from './OnboardingContext';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../core/api/supabase';
import { useTranslation } from '../../shared/localization/i18n';
import SLButton from '../../shared/components/SLButton';
import SLCard from '../../shared/components/SLCard';

export default function FinalConfirmationScreen() {
  const { onboardingData } = useOnboarding();
  const { customerProfile, logout } = useAuth();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(false);
    setErrorMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");
      const uid = session.user.id;

      let photoPath = null;
      if (onboardingData.shopPhoto && onboardingData.shopPhoto.startsWith('file://')) {
        const response = await fetch(onboardingData.shopPhoto);
        const arrayBuffer = await response.arrayBuffer();
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('shop_photos')
          .upload(`${uid}/shop.jpg`, arrayBuffer, { 
            upsert: true,
            contentType: 'image/jpeg'
          });

        if (uploadError) {
          setErrorMessage(t('onboarding.uploadError'));
          throw uploadError;
        }
        // Save the persistent path
        photoPath = uploadData.path;
      } else {
        photoPath = onboardingData.shopPhoto; // If it's already a remote URL
      }

      const payload = {
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        shopLocation: onboardingData.shopLocation,
        deliveryType: onboardingData.deliveryType,
        deliveryAddress: onboardingData.deliveryAddress,
        shopPhoto: photoPath
      };

      const { error } = await supabase.auth.updateUser({
        data: payload
      });

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Onboarding Complete!', [
        { text: 'OK' }
      ]);
    } catch (err) {
      console.error(err);
      setSaveError(true);
      if (!errorMessage) {
        setErrorMessage(t('common.error'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (saveError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorHeading}>{errorMessage || t('common.error')}</Text>
        <SLButton 
          title={isSaving ? t('common.loading') : t('common.retry')} 
          onPress={handleSave} 
          disabled={isSaving} 
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.heading}>{t('onboarding.confirmDetails')}</Text>
      
      <SLCard style={styles.summaryCard}>
        <Text style={styles.label}>SHOP</Text>
        <Text style={styles.value}>{customerProfile?.display_name || customerProfile?.legal_or_core_name}</Text>
        
        <Text style={styles.label}>SHOP LOCATION</Text>
        <Text style={styles.value}>{onboardingData.shopLocation?.address}</Text>

        <Text style={styles.label}>DELIVERY LOCATION</Text>
        <Text style={styles.value}>{onboardingData.deliveryAddress?.address || onboardingData.shopLocation?.address}</Text>

        <Text style={styles.label}>SHOP PHOTO</Text>
        {onboardingData.shopPhoto ? (
          <Image source={{ uri: onboardingData.shopPhoto }} style={styles.thumbnail} />
        ) : (
          <Text style={styles.value}>N/A</Text>
        )}
      </SLCard>

      <SLButton 
        title={isSaving ? t('common.loading') : t('common.confirm')} 
        onPress={handleSave} 
        disabled={isSaving} 
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFDF8' },
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFDF8' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#202124', textAlign: 'center', marginBottom: 24 },
  errorHeading: { fontSize: 24, fontWeight: 'bold', color: '#D93025', textAlign: 'center', marginBottom: 24 },
  summaryCard: { padding: 20, marginBottom: 32 },
  label: { fontSize: 14, color: '#1A4B8C', fontWeight: 'bold', marginBottom: 4, marginTop: 12 },
  value: { fontSize: 18, color: '#202124', fontWeight: '500' },
  thumbnail: { width: '100%', height: 150, borderRadius: 8, marginTop: 8, resizeMode: 'cover' },
});
