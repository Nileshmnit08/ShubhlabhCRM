import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { useTranslation } from '../../shared/localization/i18n';
import SLButton from '../../shared/components/SLButton';
import { supabase } from '../../core/api/supabase';
import { useAuth } from '../auth/AuthContext';
import * as Location from 'expo-location';

export default function DeliveryAddressScreen({ navigation }) {
  const { t } = useTranslation();
  const { session } = useAuth();
  
  const existingAddress = session?.user?.user_metadata?.deliveryAddress?.address || '';
  const existingLocation = session?.user?.user_metadata?.deliveryAddress?.latitude ? {
    latitude: session.user.user_metadata.deliveryAddress.latitude,
    longitude: session.user.user_metadata.deliveryAddress.longitude
  } : null;

  const [address, setAddress] = useState(existingAddress.split(',')[1]?.trim() || existingAddress);
  const [village, setVillage] = useState(existingAddress.split(',')[0]?.trim() || '');
  const [capturedLocation, setCapturedLocation] = useState(existingLocation);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isHindi = t('profile.language') !== 'Language';

  const handleCaptureLocation = async () => {
    setIsCapturing(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'लोकेशन की अनुमति नहीं दी गई।' : 'Permission to access location was denied');
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
      Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'लोकेशन प्राप्त करने में विफल।' : 'Failed to fetch location.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSave = async () => {
    if (!address) {
      Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया पता दर्ज करें।' : 'Please enter an address.');
      return;
    }

    const deliveryData = {
      address: `${village ? village + ', ' : ''}${address}`,
      ...(capturedLocation || {})
    };

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { deliveryAddress: deliveryData }
      });

      if (error) throw error;

      Alert.alert(
        isHindi ? 'सफलता' : 'Success', 
        isHindi ? 'डिलीवरी पता सफलतापूर्वक अपडेट किया गया।' : 'Delivery address updated successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert(isHindi ? 'त्रुटि' : 'Error', err.message || (isHindi ? 'पता सेव करने में विफल।' : 'Failed to save address.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SLHeader title={t('profile.deliveryAddresses')} navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content}>
        
        <SLButton 
          title={isCapturing ? t('common.loading') : (isHindi ? '📍 वर्तमान लोकेशन लें' : '📍 Use Current Location')} 
          onPress={handleCaptureLocation} 
          disabled={isCapturing || isSaving}
          variant="secondary"
          style={{ marginBottom: theme.spacing.xl }}
        />

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{isHindi ? 'पता / मोहल्ला' : 'Address / Locality'}</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder={isHindi ? "सड़क, मोहल्ला आदि" : "Street, locality, etc."}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{isHindi ? 'गाँव / शहर' : 'Village / Town'}</Text>
          <TextInput
            style={styles.input}
            value={village}
            onChangeText={setVillage}
            placeholder={isHindi ? "शहर या गाँव" : "City or Town"}
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <SLButton 
          title={isHindi ? "पता सेव करें" : "Save Address"} 
          onPress={handleSave} 
          disabled={isSaving || isCapturing}
          style={{ marginTop: theme.spacing.lg }} 
        />
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  inputContainer: { marginBottom: theme.spacing.md },
  label: { ...theme.typography.label, marginBottom: theme.spacing.sm, color: theme.colors.primary },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.medium, padding: theme.spacing.md, ...theme.typography.body, backgroundColor: theme.colors.surface },
});
