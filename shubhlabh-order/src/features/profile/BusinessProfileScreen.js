import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  BackHandler,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { SLButton } from '../../shared/components/SLButton';
import { SLCard } from '../../shared/components/SLCard';
import { SLText } from '../../shared/components/SLText';
import { useTranslation } from '../../shared/localization/i18n';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../core/api/supabase';
import {
  Store,
  FileText,
  ShieldCheck,
  MapPin,
  Check,
  ChevronDown,
  Info,
  AlertCircle,
  HelpCircle,
  Search
} from 'lucide-react-native';

const INDIAN_STATES = [
  'Rajasthan',
  'Gujarat',
  'Haryana',
  'Punjab',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Maharashtra',
  'Delhi',
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Odisha',
  'Tamil Nadu',
  'Telangana',
  'Uttarakhand',
  'West Bengal',
  'Other'
];

const BUSINESS_TYPES = [
  'Retailer',
  'Wholesaler',
  'Trader',
  'Dairy Farm',
  'Distributor',
  'Other'
];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export default function BusinessProfileScreen({ navigation, route }) {
  const { t, language } = useTranslation();
  const { userProfile, customerProfile, refreshBuyerData } = useAuth();
  const isHindi = language === 'hi';

  const scrollViewRef = useRef(null);
  const gstSectionRef = useRef(null);
  const addressSectionRef = useRef(null);

  // Form Fields
  const [shopName, setShopName] = useState(customerProfile?.display_name || '');
  const [ownerName, setOwnerName] = useState(
    customerProfile?.legal_or_core_name || userProfile?.display_name || ''
  );
  const [businessType, setBusinessType] = useState(customerProfile?.customer_type || 'Retailer');
  const [mobile, setMobile] = useState(customerProfile?.mobile || userProfile?.mobile || '');
  const [whatsapp, setWhatsapp] = useState(customerProfile?.whatsapp || userProfile?.whatsapp || '');
  const [email, setEmail] = useState(customerProfile?.email || userProfile?.email || '');
  const [description, setDescription] = useState(customerProfile?.business_context || '');

  // GST
  const initialIsGst = Boolean(customerProfile?.gst_number && customerProfile.gst_number.trim().length > 0);
  const [isGstRegistered, setIsGstRegistered] = useState(initialIsGst);
  const [gstin, setGstin] = useState(customerProfile?.gst_number || '');
  const [legalName, setLegalName] = useState(customerProfile?.legal_or_core_name || '');

  // Address
  const [city, setCity] = useState(customerProfile?.city || '');
  const [state, setState] = useState(customerProfile?.state || 'Rajasthan');
  const [pincode, setPincode] = useState('');
  const [isLookingUpPin, setIsLookingUpPin] = useState(false);

  // State Picker Modal
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // UI & Validation State
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Mark form as dirty when any field changes
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Handle Initial Section Scroll
  useEffect(() => {
    const initialSection = route?.params?.initialSection;
    if (initialSection) {
      setTimeout(() => {
        if (initialSection === 'gst') {
          scrollViewRef.current?.scrollTo({ y: 380, animated: true });
        } else if (initialSection === 'address') {
          scrollViewRef.current?.scrollTo({ y: 700, animated: true });
        }
      }, 350);
    }
  }, [route?.params]);

  // Handle Hardware Back Button
  useEffect(() => {
    const backAction = () => {
      if (isDirty) {
        promptDiscardChanges();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isDirty]);

  const promptDiscardChanges = () => {
    Alert.alert(
      t('bizProfile.unsavedTitle') || 'Unsaved Changes',
      t('bizProfile.unsavedMsg') || 'You have unsaved edits. Discard changes?',
      [
        { text: t('bizProfile.keepEditing') || 'Keep Editing', style: 'cancel' },
        {
          text: t('bizProfile.discard') || 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handleBackPress = () => {
    if (isDirty) {
      promptDiscardChanges();
    } else {
      navigation.goBack();
    }
  };

  // Pincode lookup (Auto-fill city & state)
  const handlePincodeLookup = async (codeToLookup) => {
    const code = (codeToLookup || pincode).trim();
    if (!PINCODE_REGEX.test(code)) {
      setErrors((prev) => ({
        ...prev,
        pincode: t('bizProfile.errPincode') || 'PIN code must be a 6-digit number.'
      }));
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.pincode;
      return copy;
    });

    setIsLookingUpPin(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`https://api.postalpincode.in/pincode/${code}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        if (po.District) setCity(po.District);
        if (po.State) setState(po.State);
        markDirty();
      }
    } catch (e) {
      console.log('PIN lookup skipped or timed out:', e.message);
    } finally {
      setIsLookingUpPin(false);
    }
  };

  // Form Validation
  const validateForm = () => {
    const newErrors = {};

    // 1. Business Info
    if (!shopName.trim()) {
      newErrors.shopName = t('bizProfile.errShopName') || 'Please enter your shop or business name.';
    }
    if (!ownerName.trim()) {
      newErrors.ownerName = t('bizProfile.errOwnerName') || 'Please enter the owner or contact person name.';
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (!PHONE_REGEX.test(cleanMobile)) {
      newErrors.mobile = t('bizProfile.errMobile') || 'Please enter a valid 10-digit Indian mobile number.';
    }

    if (whatsapp.trim()) {
      const cleanWa = whatsapp.replace(/\D/g, '').slice(-10);
      if (!PHONE_REGEX.test(cleanWa)) {
        newErrors.whatsapp = t('bizProfile.errWhatsapp') || 'Please enter a valid 10-digit WhatsApp number.';
      }
    }

    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      newErrors.email = t('bizProfile.errEmail') || 'Please enter a valid email address.';
    }

    // 2. GST
    if (isGstRegistered) {
      const cleanGstin = gstin.trim().toUpperCase();
      if (!cleanGstin || !GSTIN_REGEX.test(cleanGstin)) {
        newErrors.gstin = t('bizProfile.errGstin') || 'Please enter a valid 15-character GSTIN (e.g. 08AAAAA0000A1Z5).';
      }
    }

    // 3. Address
    if (!city.trim()) {
      newErrors.city = t('bizProfile.errCity') || 'Please enter your city or town.';
    }
    if (!state.trim()) {
      newErrors.state = t('bizProfile.errState') || 'Please select your state.';
    }

    if (pincode.trim() && !PINCODE_REGEX.test(pincode.trim())) {
      newErrors.pincode = t('bizProfile.errPincode') || 'PIN code must be a 6-digit number.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save to canonical backend
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Form Error',
        isHindi
          ? 'कृपया आवश्यक फ़ील्ड्स की जांच करें और पुनः प्रयास करें।'
          : 'Please check the required fields and try again.'
      );
      return;
    }

    const targetPartyId = customerProfile?.id || userProfile?.crm_party_id;
    if (!targetPartyId) {
      Alert.alert('Error', 'Unable to resolve your business account ID.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
      const cleanWhatsapp = whatsapp.trim() ? whatsapp.replace(/\D/g, '').slice(-10) : null;
      const cleanGst = isGstRegistered && gstin.trim() ? gstin.trim().toUpperCase() : null;

      // 1. Update canonical crm_parties row
      const partyPayload = {
        display_name: shopName.trim(),
        legal_or_core_name: (legalName.trim() || ownerName.trim()),
        customer_type: businessType,
        mobile: cleanMobile,
        whatsapp: cleanWhatsapp,
        email: email.trim() || null,
        city: city.trim(),
        state: state.trim(),
        gst_number: cleanGst,
        business_context: description.trim() || null
      };

      const { data: updatedParty, error: partyErr } = await supabase
        .from('crm_parties')
        .update(partyPayload)
        .eq('id', targetPartyId)
        .select();

      if (partyErr) throw partyErr;

      // 2. Sync app_users row display_name & contact info
      if (userProfile?.id) {
        const userPayload = {
          display_name: ownerName.trim(),
          mobile: cleanMobile,
          whatsapp: cleanWhatsapp
        };
        await supabase
          .from('app_users')
          .update(userPayload)
          .eq('id', userProfile.id);
      }

      // 3. Refresh Auth Context so all screens receive fresh data
      if (refreshBuyerData) {
        await refreshBuyerData();
      }

      setIsDirty(false);

      Alert.alert(
        isHindi ? 'सफलता' : 'Success',
        t('bizProfile.successMsg') || 'Business profile updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (err) {
      console.error('Save business profile error:', err);
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        err.message || (isHindi ? 'प्रोफ़ाइल सेव करने में विफल।' : 'Failed to save profile.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader
        title={t('bizProfile.title') || 'Business Profile'}
        showBack={true}
        onBackPress={handleBackPress}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Subtitle Banner */}
          <View style={styles.topBanner}>
            <Store size={22} color={theme.colors.primary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.topBannerTitle}>
                {customerProfile?.display_name || shopName || 'My Business'}
              </Text>
              <Text style={styles.topBannerSub}>
                {t('bizProfile.subtitle') || 'Manage your business registration and contact details'}
              </Text>
            </View>
          </View>

          {/* SECTION 1: BUSINESS INFORMATION */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Store size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>{t('bizProfile.secBusiness')}</Text>
            </View>

            {/* Shop / Business Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{t('bizProfile.shopName')}</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, errors.shopName && styles.inputError]}
                value={shopName}
                onChangeText={(val) => {
                  setShopName(val);
                  markDirty();
                  if (errors.shopName) {
                    setErrors((prev) => ({ ...prev, shopName: null }));
                  }
                }}
                placeholder={t('bizProfile.shopNamePlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
              />
              {errors.shopName && (
                <Text style={styles.errorText}>{errors.shopName}</Text>
              )}
            </View>

            {/* Business Type */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{t('bizProfile.businessType')}</Text>
                <Text style={styles.optionalBadge}>({t('bizProfile.optional')})</Text>
              </View>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() => setShowTypePicker(true)}
              >
                <Text style={styles.pickerTriggerText}>{businessType}</Text>
                <ChevronDown size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Owner / Contact Person */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{t('bizProfile.ownerName')}</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, errors.ownerName && styles.inputError]}
                value={ownerName}
                onChangeText={(val) => {
                  setOwnerName(val);
                  markDirty();
                  if (errors.ownerName) {
                    setErrors((prev) => ({ ...prev, ownerName: null }));
                  }
                }}
                placeholder={t('bizProfile.ownerNamePlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
              />
              {errors.ownerName && (
                <Text style={styles.errorText}>{errors.ownerName}</Text>
              )}
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{t('bizProfile.mobile')}</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, errors.mobile && styles.inputError]}
                value={mobile}
                keyboardType="phone-pad"
                maxLength={10}
                onChangeText={(val) => {
                  setMobile(val);
                  markDirty();
                  if (errors.mobile) {
                    setErrors((prev) => ({ ...prev, mobile: null }));
                  }
                }}
                placeholder={t('bizProfile.mobilePlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
              />
              {errors.mobile && (
                <Text style={styles.errorText}>{errors.mobile}</Text>
              )}
            </View>

            {/* WhatsApp Number */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{t('bizProfile.whatsapp')}</Text>
                <Text style={styles.optionalBadge}>({t('bizProfile.optional')})</Text>
              </View>
              <TextInput
                style={[styles.textInput, errors.whatsapp && styles.inputError]}
                value={whatsapp}
                keyboardType="phone-pad"
                maxLength={10}
                onChangeText={(val) => {
                  setWhatsapp(val);
                  markDirty();
                  if (errors.whatsapp) {
                    setErrors((prev) => ({ ...prev, whatsapp: null }));
                  }
                }}
                placeholder={t('bizProfile.whatsappPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
              />
              {errors.whatsapp && (
                <Text style={styles.errorText}>{errors.whatsapp}</Text>
              )}
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{t('bizProfile.email')}</Text>
                <Text style={styles.optionalBadge}>({t('bizProfile.optional')})</Text>
              </View>
              <TextInput
                style={[styles.textInput, errors.email && styles.inputError]}
                value={email}
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={(val) => {
                  setEmail(val);
                  markDirty();
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: null }));
                  }
                }}
                placeholder={t('bizProfile.emailPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{t('bizProfile.description')}</Text>
                <Text style={styles.optionalBadge}>({t('bizProfile.optional')})</Text>
              </View>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                multiline={true}
                numberOfLines={3}
                onChangeText={(val) => {
                  setDescription(val);
                  markDirty();
                }}
                placeholder={t('bizProfile.descriptionPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          {/* SECTION 2: GST & REGISTRATION */}
          <View style={styles.sectionCard} ref={gstSectionRef}>
            <View style={styles.sectionHeader}>
              <FileText size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>{t('bizProfile.secGst')}</Text>
            </View>

            {/* GST Switch */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.switchTitle}>{t('bizProfile.isGstRegistered')}</Text>
                <Text style={styles.switchSubtitle}>
                  {isGstRegistered
                    ? isHindi
                      ? 'हाँ, व्यापार के पास वैध GSTIN है'
                      : 'Yes, business holds a valid GSTIN'
                    : isHindi
                      ? 'नहीं / गैर-पंजीकृत'
                      : 'No / Unregistered composition'}
                </Text>
              </View>
              <Switch
                value={isGstRegistered}
                onValueChange={(val) => {
                  setIsGstRegistered(val);
                  markDirty();
                  if (!val) {
                    setGstin('');
                    setErrors((prev) => ({ ...prev, gstin: null }));
                  }
                }}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>

            {isGstRegistered && (
              <>
                {/* GSTIN Field */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>{t('bizProfile.gstin')}</Text>
                    <Text style={styles.requiredStar}>*</Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, errors.gstin && styles.inputError]}
                    value={gstin}
                    autoCapitalize="characters"
                    maxLength={15}
                    onChangeText={(val) => {
                      setGstin(val.toUpperCase());
                      markDirty();
                      if (errors.gstin) {
                        setErrors((prev) => ({ ...prev, gstin: null }));
                      }
                    }}
                    placeholder={t('bizProfile.gstinPlaceholder')}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                  {errors.gstin && (
                    <Text style={styles.errorText}>{errors.gstin}</Text>
                  )}
                </View>

                {/* Legal Entity Name */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>{t('bizProfile.legalName')}</Text>
                    <Text style={styles.optionalBadge}>({t('bizProfile.optional')})</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={legalName}
                    onChangeText={(val) => {
                      setLegalName(val);
                      markDirty();
                    }}
                    placeholder={t('bizProfile.legalNamePlaceholder')}
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                {/* Helper notice */}
                <View style={styles.infoBox}>
                  <Info size={16} color={theme.colors.navy} style={{ marginRight: 8, marginTop: 2 }} />
                  <Text style={styles.infoBoxText}>
                    {t('bizProfile.gstDisclaimer')}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* SECTION 3: OWNER IDENTITY & KYC (Informational Secure Policy) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <ShieldCheck size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>{t('bizProfile.secKyc')}</Text>
            </View>

            <View style={styles.kycCard}>
              <View style={styles.kycStatusBadge}>
                <Check size={14} color="#138A4B" style={{ marginRight: 4 }} />
                <Text style={styles.kycStatusText}>
                  {t('bizProfile.kycStatus')}
                </Text>
              </View>
              <Text style={styles.kycTitle}>{t('bizProfile.kycTitle')}</Text>
              <Text style={styles.kycBody}>{t('bizProfile.kycInfo')}</Text>
            </View>
          </View>

          {/* SECTION 4: REGISTERED ADDRESS */}
          <View style={styles.sectionCard} ref={addressSectionRef}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>{t('bizProfile.secAddress')}</Text>
            </View>

            {/* PIN Code with lookup */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{t('bizProfile.pincode')}</Text>
                <Text style={styles.optionalBadge}>({t('bizProfile.optional')})</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[
                    styles.textInput,
                    { flex: 1, marginRight: 8 },
                    errors.pincode && styles.inputError
                  ]}
                  value={pincode}
                  keyboardType="numeric"
                  maxLength={6}
                  onChangeText={(val) => {
                    setPincode(val);
                    markDirty();
                    if (val.trim().length === 6) {
                      handlePincodeLookup(val);
                    }
                  }}
                  placeholder={t('bizProfile.pincodePlaceholder')}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <TouchableOpacity
                  style={[
                    styles.lookupBtn,
                    (!pincode || pincode.length !== 6 || isLookingUpPin) && styles.lookupBtnDisabled
                  ]}
                  disabled={!pincode || pincode.length !== 6 || isLookingUpPin}
                  onPress={() => handlePincodeLookup()}
                >
                  {isLookingUpPin ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.lookupBtnText}>{t('bizProfile.pincodeLookup')}</Text>
                  )}
                </TouchableOpacity>
              </View>
              {errors.pincode && (
                <Text style={styles.errorText}>{errors.pincode}</Text>
              )}
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{t('bizProfile.city')}</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                style={[styles.textInput, errors.city && styles.inputError]}
                value={city}
                onChangeText={(val) => {
                  setCity(val);
                  markDirty();
                  if (errors.city) {
                    setErrors((prev) => ({ ...prev, city: null }));
                  }
                }}
                placeholder={t('bizProfile.cityPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
              />
              {errors.city && (
                <Text style={styles.errorText}>{errors.city}</Text>
              )}
            </View>

            {/* State */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>{t('bizProfile.state')}</Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TouchableOpacity
                style={[styles.pickerTrigger, errors.state && styles.inputError]}
                onPress={() => setShowStatePicker(true)}
              >
                <Text style={styles.pickerTriggerText}>{state || t('bizProfile.stateSelect')}</Text>
                <ChevronDown size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              {errors.state && (
                <Text style={styles.errorText}>{errors.state}</Text>
              )}
            </View>

            {/* Notice regarding separate delivery address */}
            <View style={[styles.infoBox, { backgroundColor: '#FFF8E1', borderColor: '#FFE082' }]}>
              <Info size={16} color="#E65100" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.infoBoxText, { color: '#E65100' }]}>
                {t('bizProfile.addressNotice')}
              </Text>
            </View>
          </View>

          {/* ACTION BUTTON */}
          <View style={styles.actionContainer}>
            <SLButton
              title={isSaving ? (t('bizProfile.saving') || 'Saving...') : (t('bizProfile.saveBtn') || 'Save Business Profile')}
              onPress={handleSave}
              disabled={isSaving}
              loading={isSaving}
              style={styles.saveBtn}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* STATE PICKER MODAL */}
      <Modal
        visible={showStatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatePicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>{t('bizProfile.stateSelect')}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {INDIAN_STATES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.modalItem, state === st && styles.modalItemActive]}
                  onPress={() => {
                    setState(st);
                    markDirty();
                    if (errors.state) {
                      setErrors((prev) => ({ ...prev, state: null }));
                    }
                    setShowStatePicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, state === st && styles.modalItemTextActive]}>
                    {st}
                  </Text>
                  {state === st && <Check size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* BUSINESS TYPE PICKER MODAL */}
      <Modal
        visible={showTypePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTypePicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>{t('bizProfile.businessType')}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {BUSINESS_TYPES.map((bt) => (
                <TouchableOpacity
                  key={bt}
                  style={[styles.modalItem, businessType === bt && styles.modalItemActive]}
                  onPress={() => {
                    setBusinessType(bt);
                    markDirty();
                    setShowTypePicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, businessType === bt && styles.modalItemTextActive]}>
                    {bt}
                  </Text>
                  {businessType === bt && <Check size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scrollContent: {
    padding: theme.spacing.md
  },
  topBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: theme.spacing.md,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    borderColor: '#FFE082',
    marginBottom: theme.spacing.md
  },
  topBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E65100'
  },
  topBannerSub: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.md
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary
  },
  inputGroup: {
    marginBottom: theme.spacing.md
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary
  },
  requiredStar: {
    color: theme.colors.error,
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '700'
  },
  optionalBadge: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top'
  },
  inputError: {
    borderColor: theme.colors.error,
    backgroundColor: '#FFF8F8'
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface
  },
  pickerTriggerText: {
    fontSize: 15,
    color: theme.colors.textPrimary
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: theme.spacing.sm
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary
  },
  switchSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#C2D7FA',
    borderRadius: theme.radius.medium,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs
  },
  infoBoxText: {
    fontSize: 12,
    color: '#1A4B8C',
    flex: 1,
    lineHeight: 18
  },
  kycCard: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E8EAED',
    borderRadius: theme.radius.medium,
    padding: theme.spacing.md
  },
  kycStatusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8
  },
  kycStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#138A4B'
  },
  kycTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4
  },
  kycBody: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19
  },
  lookupBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.radius.medium,
    justifyContent: 'center',
    alignItems: 'center'
  },
  lookupBtnDisabled: {
    backgroundColor: theme.colors.disabled
  },
  lookupBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  actionContainer: {
    marginTop: theme.spacing.sm
  },
  saveBtn: {
    height: 52
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.large,
    padding: theme.spacing.md,
    maxHeight: 460
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4'
  },
  modalItemActive: {
    backgroundColor: '#FFF8E1'
  },
  modalItemText: {
    fontSize: 15,
    color: theme.colors.textPrimary
  },
  modalItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '700'
  }
});
