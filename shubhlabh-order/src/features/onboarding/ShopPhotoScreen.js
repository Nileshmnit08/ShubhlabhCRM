import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Linking, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useOnboarding } from './OnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../../shared/localization/i18n';
import SLButton from '../../shared/components/SLButton';

export default function ShopPhotoScreen() {
  const { updateData } = useOnboarding();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [photoUri, setPhotoUri] = useState(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission denied.', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: 'Settings', onPress: () => Linking.openSettings() }
      ]);
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Gallery permission denied.', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: 'Settings', onPress: () => Linking.openSettings() }
      ]);
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleConfirm = () => {
    if (photoUri) {
      updateData({ shopPhoto: photoUri });
      navigation.navigate('FinalConfirmation');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <Text style={styles.heading}>{t('onboarding.shopPhoto')}</Text>
      
      {photoUri ? (
        <View style={styles.center}>
          <Image source={{ uri: photoUri }} style={styles.imagePreview} />
          <SLButton title="Continue" onPress={handleConfirm} style={{width: '100%', marginBottom: 16}} />
          <SLButton title="Replace Photo" variant="secondary" onPress={() => setPhotoUri(null)} style={{width: '100%'}} />
        </View>
      ) : (
        <View style={styles.center}>
          <TouchableOpacity style={styles.largeOption} onPress={takePhoto}>
            <Text style={styles.optionIcon}>📷</Text>
            <Text style={styles.optionText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.largeOption} onPress={pickImage}>
            <Text style={styles.optionIcon}>🖼️</Text>
            <Text style={styles.optionText}>Gallery</Text>
          </TouchableOpacity>
          
          <SLButton 
            title="Skip for now" 
            variant="secondary" 
            onPress={() => {
              updateData({ shopPhoto: null });
              navigation.navigate('FinalConfirmation');
            }} 
            style={{width: '100%', marginTop: 8}} 
          />
        </View>
      )}

      <View style={{ height: 32 }} />
      <SLButton title={t('common.cancel')} variant="secondary" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFDF8' },
  center: { alignItems: 'center', width: '100%' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#202124', textAlign: 'center', marginBottom: 32 },
  largeOption: { backgroundColor: '#F3F4F6', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 24, width: '100%', borderWidth: 2, borderColor: '#E5E7EB' },
  optionIcon: { fontSize: 40, marginBottom: 8 },
  optionText: { fontSize: 20, fontWeight: 'bold', color: '#202124' },
  imagePreview: { width: '100%', height: 300, borderRadius: 12, marginBottom: 24, resizeMode: 'cover' },
});
