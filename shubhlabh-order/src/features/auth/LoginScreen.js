import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, Image, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../core/api/supabase';
import { useAuth } from './AuthContext';
import { theme } from '../../shared/theme';
import { SLButton } from '../../shared/components/SLButton';
import { SLCard } from '../../shared/components/SLCard';
import { useTranslation } from '../../shared/localization/i18n';
import { Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { authError, logout } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', t('common.error')); // simplify alert for this sprint
      return;
    }

    setIsLoggingIn(true);
    const cleanEmail = email.trim();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
          Alert.alert('Error', 'Login ID ya Password galat hai.');
        } else if (error.message.includes('Database error querying schema')) {
          Alert.alert('System Error', 'Account configuration error. Please contact the administrator to fix your profile.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
          Alert.alert('Error', 'Internet connection check karein.');
        } else {
          Alert.alert('Error', error.message || 'Abhi login nahi ho pa raha.');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Abhi login nahi ho pa raha.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      t('auth.support'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL('tel:+919999999999') }
      ]
    );
  };

  if (authError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <SLCard style={styles.errorCard}>
            <Text style={styles.errorTitle}>Access Denied</Text>
            {authError === 'ROLE_INVALID' && (
              <Text style={styles.errorMessage}>Ye account Shubh Labh Order App ke liye available nahi hai.</Text>
            )}
            {authError === 'MAPPING_INVALID' && (
              <Text style={styles.errorMessage}>Aapke account ki customer jankari available nahi hai.</Text>
            )}
            {authError === 'NOT_FOUND' && (
              <Text style={styles.errorMessage}>Account profile nahi mila.</Text>
            )}
            
            <SLButton 
              title="CONTACT SHUBH LABH" 
              variant="primary" 
              onPress={handleContactSupport} 
              style={{ marginBottom: theme.spacing.md, backgroundColor: theme.colors.alert }} 
            />
            
            <SLButton 
              title={t('profile.logout')} 
              variant="outline" 
              onPress={logout} 
            />
          </SLCard>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image 
              source={require('../../../assets/icon.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
          </View>

          <SLCard>
            <Text style={styles.cardTitle}>{t('auth.login')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.loginID')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoggingIn}
                placeholder="email@example.com"
                placeholderTextColor={theme.colors.disabled}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoggingIn}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.disabled}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={theme.colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={theme.colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <SLButton
              title={isLoggingIn ? t('common.loading') : t('auth.login')}
              onPress={handleLogin}
              loading={isLoggingIn}
              style={styles.loginBtn}
            />
          </SLCard>

          <TouchableOpacity style={styles.supportBtn} onPress={handleContactSupport}>
            <Text style={styles.supportText}>{t('auth.support')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  cardTitle: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    ...theme.typography.bodyLarge,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  passwordInput: {
    flex: 1,
    padding: theme.spacing.md,
    ...theme.typography.bodyLarge,
  },
  eyeIcon: {
    padding: theme.spacing.md,
  },
  loginBtn: {
    marginTop: theme.spacing.md,
  },
  supportBtn: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  supportText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  errorCard: {
    borderColor: theme.colors.alert,
    borderWidth: 2,
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorTitle: {
    ...theme.typography.h2,
    color: theme.colors.alert,
    marginBottom: theme.spacing.md,
  },
  errorMessage: {
    ...theme.typography.bodyLarge,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    color: theme.colors.textSecondary,
  },
});
