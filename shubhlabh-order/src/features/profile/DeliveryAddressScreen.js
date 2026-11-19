import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Crosshair, MapPin, Building2, Save, Info } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { useTranslation } from '../../shared/localization/i18n';
import { supabase } from '../../core/api/supabase';
import { useAuth } from '../auth/AuthContext';
import * as Location from 'expo-location';
import DeliveryIllustration from './DeliveryIllustration';

const DEEP_ORANGE = '#E8590C';

// Orange gradient header with a soft wave (visual only). Back works exactly like the shared SLHeader.
function GradientHeader({ title, navigation }) {
  let insets = { top: 0 };
  try { insets = useSafeAreaInsets(); } catch (e) { /* outside a SafeAreaProvider (tests) */ }
  const handleBack = navigation ? () => {
    if (navigation.canGoBack && navigation.canGoBack()) navigation.goBack();
    else if (navigation.navigate) navigation.navigate('MainTabs');
  } : null;
  const bodyHeight = insets.top + 64;
  return (
    <View style={{ height: bodyHeight + 26, backgroundColor: theme.colors.background }}>
      <Svg width="100%" height={bodyHeight + 26} viewBox={`0 0 360 ${bodyHeight + 26}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="hdr" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FF9A1F" />
            <Stop offset="1" stopColor="#F26B0F" />
          </LinearGradient>
        </Defs>
        <Path d={`M0 0 H360 V${bodyHeight - 4} C 280 ${bodyHeight + 30}, 170 ${bodyHeight - 22}, 0 ${bodyHeight + 18} Z`} fill="url(#hdr)" />
      </Svg>
      <View style={[styles.headerRow, { top: insets.top }]}>
        {handleBack ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={28} color={theme.colors.white} />
          </TouchableOpacity>
        ) : <View style={styles.backButton} />}
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.backButton} />
      </View>
    </View>
  );
}

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

  const busy = isSaving || isCapturing;

  return (
    <View style={styles.container}>
      <GradientHeader title={t('profile.deliveryAddresses')} navigation={navigation} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Intro */}
          <View style={styles.intro}>
            <DeliveryIllustration width={132} height={98} />
            <View style={styles.introText}>
              <Text style={styles.introTitle}>{t('deliveryAddress.heading')}</Text>
              <Text style={styles.introSub}>{t('deliveryAddress.subheading')}</Text>
            </View>
          </View>

          {/* Use Current Location */}
          <TouchableOpacity
            style={[styles.locationCard, busy && styles.disabled]}
            onPress={handleCaptureLocation}
            disabled={busy}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {isCapturing ? <ActivityIndicator color={DEEP_ORANGE} /> : <Crosshair size={28} color={DEEP_ORANGE} />}
            <Text style={styles.locationText}>
              {isCapturing ? t('common.loading') : (isHindi ? 'वर्तमान लोकेशन लें' : 'Use Current Location')}
            </Text>
            <ChevronRight size={22} color={DEEP_ORANGE} />
          </TouchableOpacity>

          {/* One address form card */}
          <View style={styles.formCard}>
            <View style={styles.fieldRow}>
              <View style={styles.iconTile}><MapPin size={24} color={DEEP_ORANGE} /></View>
              <View style={styles.fieldBody}>
                <Text style={styles.label}>
                  {isHindi ? 'पता / मोहल्ला' : 'Address / Locality'} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder={isHindi ? "सड़क, मोहल्ला आदि" : "Street, locality, etc."}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.iconTile}><Building2 size={24} color={DEEP_ORANGE} /></View>
              <View style={styles.fieldBody}>
                <Text style={styles.label}>{isHindi ? 'गाँव / शहर' : 'Village / Town'}</Text>
                <TextInput
                  style={styles.input}
                  value={village}
                  onChangeText={setVillage}
                  placeholder={isHindi ? "शहर या गाँव" : "City or Town"}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, busy && styles.disabled]}
              onPress={handleSave}
              disabled={busy}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {isSaving ? <ActivityIndicator color={theme.colors.white} /> : <Save size={24} color={theme.colors.white} />}
              <Text style={styles.saveText}>{isHindi ? 'पता सेव करें' : 'Save Address'}</Text>
            </TouchableOpacity>
          </View>

          {/* Note */}
          <View style={styles.note}>
            <Info size={22} color={DEEP_ORANGE} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle}>{t('deliveryAddress.noteTitle')}</Text>
              <Text style={styles.noteText}>{t('deliveryAddress.note')}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  headerRow: { position: 'absolute', left: 0, right: 0, height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  backButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '700', color: theme.colors.white },
  content: { paddingHorizontal: 16, paddingBottom: 120 }, // room for the floating support button and the tab bar
  intro: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  introText: { flex: 1, marginLeft: 8 },
  introTitle: { fontSize: 20, fontWeight: '800', color: '#1F2A44' },
  introSub: { fontSize: 14, lineHeight: 20, color: theme.colors.textSecondary, marginTop: 4 },
  locationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60,
    backgroundColor: '#FFF3E0', borderWidth: 1.5, borderColor: '#FFCC80', borderRadius: 18,
    paddingHorizontal: 18, marginBottom: 16,
  },
  locationText: { flex: 1, fontSize: 17, fontWeight: '700', color: DEEP_ORANGE },
  formCard: {
    backgroundColor: theme.colors.surface, borderRadius: 22, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#F3E6D3', elevation: 3,
    shadowColor: '#7A4A00', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  iconTile: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF0DC', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 24 },
  fieldBody: { flex: 1 },
  label: { fontSize: 15, fontWeight: '700', color: '#1F2A44', marginBottom: 6 },
  required: { color: '#D92D20', fontWeight: '800' },
  input: {
    minHeight: 50, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, paddingHorizontal: 14,
    fontSize: 17, color: theme.colors.textPrimary, backgroundColor: '#FAFAFA',
  },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 58,
    backgroundColor: theme.colors.primary, borderRadius: 16, marginTop: 4,
    elevation: 3, shadowColor: DEEP_ORANGE, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
  saveText: { fontSize: 19, fontWeight: '800', color: theme.colors.white },
  disabled: { opacity: 0.6 },
  note: {
    flexDirection: 'row', gap: 12, backgroundColor: '#FFF6EA', borderWidth: 1, borderColor: '#F7E3C8',
    borderRadius: 16, padding: 14,
  },
  noteTitle: { fontSize: 15, fontWeight: '800', color: '#8A4B0F', marginBottom: 2 },
  noteText: { fontSize: 14, lineHeight: 20, color: '#5A3E22' },
});
