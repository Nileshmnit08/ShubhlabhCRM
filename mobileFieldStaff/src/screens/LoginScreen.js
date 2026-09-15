import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { Button, EmptyState } from '../components';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const { t } = useTranslation();
  const { login, loading: authLoading, authError, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setLoginError(t('auth.error.emptyFields'));
      return;
    }
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setLoginError(err.message || t('auth.error.default'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.centeredSafe}>
        <EmptyState title={t('auth.loading.title')} message={t('auth.loading.message')} icon="hourglass-empty" />
      </SafeAreaView>
    );
  }

  if (authError) {
    let title = t('auth.error.authError');
    let message = t('auth.error.unknown');
    
    if (authError === 'MISSING_PROFILE') {
      title = t('auth.error.missingProfileTitle');
      message = t('auth.error.missingProfileMessage');
    } else if (authError === 'UNAUTHORIZED') {
      title = t('auth.error.unauthorizedTitle');
      message = t('auth.error.unauthorizedMessage');
    } else if (authError === 'BACKEND_ERROR') {
      title = t('auth.error.backendErrorTitle');
      message = t('auth.error.backendErrorMessage');
    } else if (authError === 'NETWORK_ERROR') {
      title = t('auth.error.networkErrorTitle');
      message = t('auth.error.networkErrorMessage');
    } else if (authError === 'SESSION_EXPIRED') {
      title = t('auth.error.sessionExpiredTitle') || 'Session Expired';
      message = t('auth.error.sessionExpiredMessage') || 'Your session has expired or is invalid. Please sign in again.';
    }

    return (
      <SafeAreaView style={styles.centeredSafe}>
        <View style={styles.container}>
          <EmptyState title={title} message={message} icon="error-outline" />
          <View style={{ marginTop: 24, width: '100%' }}>
            <Button title={t('auth.action.signOut')} variant="secondary" onPress={logout} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <MaterialIcons name="eco" size={64} color={colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.title}>{t('auth.brand.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.brand.subtitle')}</Text>
          </View>

          <View style={[styles.card, elevation.level1]}>
            <Text style={styles.cardTitle}>{t('auth.action.signIn')}</Text>
            
            {loginError && (
              <View style={styles.errorBox}>
                <MaterialIcons name="error" size={20} color={colors.error} />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('auth.label.email')}</Text>
              <TextInput 
                style={styles.input} 
                placeholder={t('auth.placeholder.email')} 
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('auth.label.password')}</Text>
              <TextInput 
                style={styles.input} 
                placeholder={t('auth.placeholder.password')} 
                placeholderTextColor={colors.onSurfaceVariant}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.actionContainer}>
              <Button 
                title={isSubmitting ? t('auth.action.signingIn') : t('auth.action.signIn')} 
                onPress={handleLogin} 
                disabled={isSubmitting} 
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  centeredSafe: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    ...typography.headlineLg,
    color: colors.primary,
  },
  subtitle: {
    ...typography.titleMd,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    height: 48,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  actionContainer: {
    marginTop: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    padding: 12,
    borderRadius: rounded.default,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.onErrorContainer,
    flex: 1,
  },
});
