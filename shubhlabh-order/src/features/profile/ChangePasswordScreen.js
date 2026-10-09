import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { useTranslation } from '../../shared/localization/i18n';
import SLInput from '../../shared/components/SLInput';
import SLButton from '../../shared/components/SLButton';
import { supabase } from '../../core/api/supabase';

export default function ChangePasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isHindi = t('profile.language') !== 'Language';
  
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'कृपया सभी फ़ील्ड भरें।' : 'Please fill all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' : 'New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      Alert.alert(
        isHindi ? 'सफलता' : 'Success', 
        isHindi ? 'पासवर्ड सफलतापूर्वक बदल दिया गया है।' : 'Password changed successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert(isHindi ? 'त्रुटि' : 'Error', err.message || (isHindi ? 'पासवर्ड अपडेट करने में विफल।' : 'Failed to update password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SLHeader title={t('profile.changePassword') || 'Change Password'} navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content}>
        
        <SLInput
          label={isHindi ? "नया पासवर्ड" : "New Password"}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder={isHindi ? "अपना नया पासवर्ड दर्ज करें" : "Enter new password"}
        />

        <SLInput
          label={isHindi ? "नया पासवर्ड कन्फर्म करें" : "Confirm New Password"}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder={isHindi ? "अपना नया पासवर्ड फिर से दर्ज करें" : "Confirm your new password"}
        />

        <SLButton 
          title={isHindi ? "पासवर्ड बदलें" : "Change Password"} 
          onPress={handleChangePassword} 
          disabled={loading}
          style={{ marginTop: theme.spacing.xl }}
        />
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.xl },
});
