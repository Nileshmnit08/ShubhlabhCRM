import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useOnboarding } from './OnboardingContext';
import { useNavigation } from '@react-navigation/native';

export default function ShopPhotoScreen() {
  const { updateData } = useOnboarding();
  const navigation = useNavigation();
  const [photoUri, setPhotoUri] = useState(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission chahiye.', [
        { text: 'Cancel', style: 'cancel' },
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
      Alert.alert('Permission denied', 'Gallery permission chahiye.', [
        { text: 'Cancel', style: 'cancel' },
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
    <View style={styles.container}>
      <Text style={styles.heading}>SHOP KI PHOTO LAGAYEIN</Text>
      <Text style={styles.subtext}>Ye photo aapki shop ko pehchanne ke liye hai.</Text>
      
      {photoUri ? (
        <View style={styles.center}>
          <Image source={{ uri: photoUri }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
            <Text style={styles.primaryButtonText}>CONFIRM KAREIN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setPhotoUri(null)}>
            <Text style={styles.secondaryButtonText}>DOBARA PHOTO LEIN</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.center}>
          <TouchableOpacity style={styles.largeOption} onPress={takePhoto}>
            <Text style={styles.optionIcon}>📷</Text>
            <Text style={styles.optionText}>PHOTO KHICHEIN</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.largeOption} onPress={pickImage}>
            <Text style={styles.optionIcon}>🖼️</Text>
            <Text style={styles.optionText}>GALLERY SE LEIN</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>WAAPAS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  center: { alignItems: 'center', width: '100%' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', marginBottom: 16 },
  subtext: { fontSize: 16, color: '#4B5563', textAlign: 'center', marginBottom: 32 },
  largeOption: { backgroundColor: '#F3F4F6', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 24, width: '100%', borderWidth: 2, borderColor: '#E5E7EB' },
  optionIcon: { fontSize: 40, marginBottom: 8 },
  optionText: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  imagePreview: { width: '100%', height: 300, borderRadius: 12, marginBottom: 24, resizeMode: 'cover' },
  primaryButton: { backgroundColor: '#F97316', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16, width: '100%' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, alignItems: 'center', width: '100%' },
  secondaryButtonText: { color: '#4B5563', fontSize: 18, fontWeight: 'bold' },
  backButton: { marginTop: 32, padding: 16, alignItems: 'center' },
  backButtonText: { color: '#6B7280', fontSize: 16, fontWeight: 'bold' }
});
