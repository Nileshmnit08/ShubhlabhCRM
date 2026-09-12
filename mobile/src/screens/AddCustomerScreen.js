import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Store, Mic, Phone, Info, MapPin, Navigation, ChevronDown, CheckCircle2, ChevronLeft, Building2, Combine, Egg, Droplet, CheckCircle } from 'lucide-react-native';

const CUSTOMER_TYPES = [
  { id: 'Dealer', label: 'Dealer', icon: Store },
  { id: 'Distributor', label: 'Distributor', icon: Building2 },
  { id: 'Farmer', label: 'Farmer / Direct', icon: Combine },
  { id: 'Dairy', label: 'Dairy Farm', icon: Droplet },
  { id: 'Poultry', label: 'Poultry', icon: Egg },
  { id: 'Other', label: 'Other Business', icon: Building2 },
];

export default function AddCustomerScreen({ navigation }) {
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [form, setForm] = useState({
    businessName: '',
    contactPerson: '',
    primaryMobile: '',
    altMobile: '',
    customerType: 'Dealer',
    streetAddress: '',
    cityName: '',
    stateName: 'Gujarat',
    pinCode: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState(null);

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const copyPrimaryToAlt = () => {
    if (form.primaryMobile) {
      updateForm('altMobile', form.primaryMobile);
    }
  };

  const captureGpsLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to auto-fill address.');
        setGpsLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geocode = await Location.reverseGeocodeAsync(location.coords);
      
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        updateForm('cityName', place.city || place.subregion || '');
        updateForm('pinCode', place.postalCode || '');
        if (place.region) {
          updateForm('stateName', place.region);
        }
      } else {
        Alert.alert('Notice', 'Could not determine address from location.');
      }
    } catch (error) {
      console.warn(error);
      Alert.alert('Error', 'Failed to get location.');
    } finally {
      setGpsLoading(false);
    }
  };

  const validateForm = () => {
    if (!form.businessName.trim()) return 'Business Name is required';
    if (!form.primaryMobile || form.primaryMobile.length < 10) return 'Valid 10-digit Primary Mobile is required';
    if (!form.streetAddress.trim()) return 'Street Address is required';
    if (!form.cityName.trim()) return 'City is required';
    if (!form.pinCode || form.pinCode.length < 6) return 'Valid 6-digit Pincode is required';
    return null;
  };

  const handleSave = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    setLoading(true);
    try {
      // Identity check: does this mobile already exist?
      const { data: existing, error: searchError } = await supabase
        .from('crm_parties')
        .select('id')
        .eq('mobile', form.primaryMobile)
        .limit(1);
        
      if (existing && existing.length > 0) {
        Alert.alert('Duplicate Customer', 'A customer with this primary mobile number already exists.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from('crm_parties').insert({
        display_name: form.businessName.trim(),
        contact_person: form.contactPerson.trim(),
        mobile: form.primaryMobile,
        alternate_mobile: form.altMobile,
        customer_type: form.customerType,
        address_line_1: form.streetAddress.trim(),
        city: form.cityName.trim(),
        state: form.stateName,
        pincode: form.pinCode,
        status: 'Active',
        assigned_owner_id: userProfile?.id || null
      }).select().single();

      if (error) throw error;
      
      setNewCustomerId(data.id);
      setSuccessMode(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Save Failed', err.message || 'An error occurred while saving the customer.');
    } finally {
      setLoading(false);
    }
  };

  if (successMode) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Add Customer" showBack={true} onBack={() => navigation.goBack()} />
        <View style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <CheckCircle2 size={48} color={theme.colors.secondary} />
          </View>
          <Text style={styles.successTitle}>Customer Added Successfully</Text>
          <Text style={styles.successDesc}>{form.businessName} registered.</Text>
          
          <View style={styles.successActions}>
            <TouchableOpacity 
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => {
                navigation.goBack();
                navigation.navigate('CustomerDetail', { customerId: newCustomerId });
              }}
            >
              <Text style={styles.btnTextPrimary}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btn, styles.btnOutline]}
              onPress={() => {
                setForm({
                  businessName: '', contactPerson: '', primaryMobile: '', altMobile: '',
                  customerType: 'Dealer', streetAddress: '', cityName: '', stateName: 'Gujarat', pinCode: '',
                });
                setSuccessMode(false);
                setNewCustomerId(null);
              }}
            >
              <Text style={styles.btnTextOutline}>Add Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Add Customer" showBack={true} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Business Profile */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBox}>
              <Store size={20} color={theme.colors.secondary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Business Profile</Text>
              <Text style={styles.sectionSubtitle}>व्यापार और संपर्क विवरण</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Customer / Business Name <Text style={styles.req}>*</Text></Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Balaji Agro Agencies" 
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={form.businessName}
              onChangeText={(v) => updateForm('businessName', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Key Contact Person</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Rajesh Patel - Owner" 
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={form.contactPerson}
              onChangeText={(v) => updateForm('contactPerson', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Primary Mobile Number <Text style={styles.req}>*</Text></Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.phonePrefix}>
                <Phone size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput 
                style={[styles.input, styles.phoneInput]} 
                placeholder="10 digit number" 
                placeholderTextColor={theme.colors.onSurfaceVariant}
                keyboardType="phone-pad"
                maxLength={10}
                value={form.primaryMobile}
                onChangeText={(v) => updateForm('primaryMobile', v.replace(/[^0-9]/g, ''))}
              />
            </View>
            <View style={styles.helperRow}>
              <Info size={14} color={theme.colors.secondary} />
              <Text style={styles.helperText}>10-digit number used for WhatsApp dispatch & billing notices</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Alternate Mobile / WhatsApp</Text>
              <TouchableOpacity onPress={copyPrimaryToAlt}>
                <Text style={styles.linkText}>Same as Primary</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.phoneInputRow}>
              <View style={styles.phonePrefix}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput 
                style={[styles.input, styles.phoneInput]} 
                placeholder="e.g. 9825123456" 
                placeholderTextColor={theme.colors.onSurfaceVariant}
                keyboardType="phone-pad"
                maxLength={10}
                value={form.altMobile}
                onChangeText={(v) => updateForm('altMobile', v.replace(/[^0-9]/g, ''))}
              />
            </View>
          </View>
        </View>

        {/* Customer Classification */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBox}>
              <Building2 size={20} color={theme.colors.secondary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Customer Classification <Text style={styles.req}>*</Text></Text>
              <Text style={styles.sectionSubtitle}>ग्राहक श्रेणी का चयन करें</Text>
            </View>
          </View>

          <View style={styles.grid}>
            {CUSTOMER_TYPES.map((type) => {
              const isSelected = form.customerType === type.id;
              const IconComp = type.icon;
              return (
                <TouchableOpacity 
                  key={type.id} 
                  style={[styles.pillContainer, isSelected && styles.pillSelected]} 
                  onPress={() => updateForm('customerType', type.id)}
                  activeOpacity={0.7}
                >
                  <IconComp size={20} color={isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant} />
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>{type.label}</Text>
                  {isSelected && <CheckCircle size={16} color={theme.colors.onPrimaryContainer} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Address & GPS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBox}>
              <MapPin size={20} color={theme.colors.secondary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Delivery & Billing Address</Text>
              <Text style={styles.sectionSubtitle}>पता एवं जीपीएस स्थान</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.gpsBtn} onPress={captureGpsLocation} disabled={gpsLoading}>
            {gpsLoading ? <ActivityIndicator color={theme.colors.secondary} size="small" /> : <Navigation size={18} color={theme.colors.secondary} />}
            <Text style={styles.gpsBtnText}>{gpsLoading ? 'Acquiring GPS Fix...' : 'Auto-fill Current GPS Location'}</Text>
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address Line (Shop / Plot / GIDC) <Text style={styles.req}>*</Text></Text>
            <TextInput 
              style={styles.input} 
              placeholder="Plot No, Near Market Yard, Post Road" 
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={form.streetAddress}
              onChangeText={(v) => updateForm('streetAddress', v)}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>City / Taluka <Text style={styles.req}>*</Text></Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Sanand" 
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={form.cityName}
                onChangeText={(v) => updateForm('cityName', v)}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: theme.spacing.xs }]}>
              <Text style={styles.label}>Pincode <Text style={styles.req}>*</Text></Text>
              <TextInput 
                style={styles.input} 
                placeholder="382110" 
                placeholderTextColor={theme.colors.onSurfaceVariant}
                keyboardType="numeric"
                maxLength={6}
                value={form.pinCode}
                onChangeText={(v) => updateForm('pinCode', v.replace(/[^0-9]/g, ''))}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>State <Text style={styles.req}>*</Text></Text>
            <View style={styles.selectWrapper}>
              <TextInput 
                style={styles.input} 
                value={form.stateName}
                onChangeText={(v) => updateForm('stateName', v)}
              />
            </View>
          </View>
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text style={styles.saveBtnText}>Save Customer (ग्राहक सहेजें)</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={styles.cancelBtnText}>Cancel & Return (रद्द करें)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing['screen-edge'], paddingBottom: 150 },
  section: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.borders.radius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  iconBox: {
    width: 32, height: 32, borderRadius: theme.borders.radius.md,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.xs
  },
  sectionTitle: { fontSize: theme.typography.sizes.titleMd, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },
  sectionSubtitle: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant },
  
  inputGroup: { marginBottom: theme.spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: theme.typography.sizes.labelMd, fontWeight: theme.typography.weights.semibold, color: theme.colors.onSurface, marginBottom: 4 },
  req: { color: theme.colors.error },
  input: {
    height: 48, backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borders.radius.md, paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface,
  },
  
  phoneInputRow: { flexDirection: 'row', alignItems: 'center' },
  phonePrefix: {
    height: 48, paddingHorizontal: theme.spacing.sm, backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.borders.radius.md, marginRight: theme.spacing.xs,
    flexDirection: 'row', alignItems: 'center'
  },
  prefixText: { fontSize: theme.typography.sizes.numericData, fontWeight: theme.typography.weights.semibold, marginLeft: 4, color: theme.colors.onSurface },
  phoneInput: { flex: 1, fontSize: theme.typography.sizes.numericData, letterSpacing: 1 },
  
  helperRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  helperText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, marginLeft: 4 },
  linkText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.secondary, fontWeight: theme.typography.weights.semibold },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pillContainer: {
    width: '48%', height: 48, backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.sm, marginBottom: theme.spacing.xs
  },
  pillSelected: { backgroundColor: theme.colors.primaryContainer },
  pillText: { flex: 1, fontSize: theme.typography.sizes.labelLg, fontWeight: theme.typography.weights.semibold, color: theme.colors.onSurface, marginLeft: 8 },
  pillTextSelected: { color: theme.colors.onPrimaryContainer },
  
  gpsBtn: {
    height: 48, backgroundColor: theme.colors.surfaceContainerHigh, borderRadius: theme.borders.radius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md
  },
  gpsBtnText: { fontSize: theme.typography.sizes.labelMd, fontWeight: theme.typography.weights.semibold, color: theme.colors.secondary, marginLeft: 8 },
  row: { flexDirection: 'row' },
  
  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: theme.spacing['screen-edge'],
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant,
  },
  saveBtn: { height: 52, backgroundColor: theme.colors.secondary, borderRadius: theme.borders.radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  saveBtnText: { color: theme.colors.onPrimary, fontSize: theme.typography.sizes.titleMd, fontWeight: theme.typography.weights.bold },
  cancelBtn: { height: 40, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: theme.colors.onSurfaceVariant, fontSize: theme.typography.sizes.labelMd, fontWeight: theme.typography.weights.semibold },
  
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: theme.colors.onSurface, marginBottom: 8, textAlign: 'center' },
  successDesc: { fontSize: 16, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 32 },
  successActions: { flexDirection: 'row', width: '100%', gap: 16 },
  btn: { flex: 1, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: theme.colors.secondary },
  btnOutline: { borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
  btnTextPrimary: { color: '#fff', fontWeight: 'bold' },
  btnTextOutline: { color: theme.colors.onSurface, fontWeight: 'bold' },
});
