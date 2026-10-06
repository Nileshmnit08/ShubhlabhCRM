import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { supabase } from '../../core/api/supabase';
import { useAuth } from './AuthContext';
import { theme } from '../../shared/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { authError, logout } = useAuth();

  const handleLogin = async () => {
    if (!email && !password) {
      Alert.alert('Error', 'Login ID aur Password daalein.');
      return;
    }
    if (!email) {
      Alert.alert('Error', 'Login ID daalein.');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Password daalein.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
          Alert.alert('Error', 'Login ID ya Password galat hai.');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
          Alert.alert('Error', 'Internet connection check karein.');
        } else {
          Alert.alert('Error', 'Abhi login nahi ho pa raha.');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Abhi login nahi ho pa raha.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleContactSupport = () => {
    // Basic intent to call or open whatsapp, depending on implementation
    Alert.alert(
      'Sampark Karein',
      'Shubh Labh support ko call ya WhatsApp karein.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => Linking.openURL('tel:+919999999999') }
      ]
    );
  };

  if (authError) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
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
          
          <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
            <Text style={styles.contactButtonText}>CONTACT SHUBH LABH</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>Shubh Labh Order</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Login ID</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!isLoggingIn}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.inputPassword}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoggingIn}
          />
          <Text style={styles.eyeIcon}>👁</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.loginButton, isLoggingIn && styles.loginButtonDisabled]}
        onPress={handleLogin}
        disabled={isLoggingIn}
      >
        {isLoggingIn ? (
          <Text style={styles.loginButtonText}>Login ho raha hai...</Text>
        ) : (
          <Text style={styles.loginButtonText}>LOGIN</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Password bhool gaye?</Text>
        <TouchableOpacity onPress={handleContactSupport}>
          <Text style={styles.footerLink}>Shubh Labh se sampark karein</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F97316', // Orange
    textAlign: 'center',
    marginBottom: 48,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  inputPassword: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeIcon: {
    padding: 12,
    fontSize: 18,
    color: '#6B7280',
  },
  loginButton: {
    backgroundColor: '#F97316',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    backgroundColor: '#FDBA74',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  card: {
    padding: 24,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: 24,
  },
  contactButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#6B7280',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
