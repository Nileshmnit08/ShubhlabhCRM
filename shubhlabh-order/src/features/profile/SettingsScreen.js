import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { useTranslation } from '../../shared/localization/i18n';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { ChevronRight, Moon, Type, Globe, Bell, Info, Lock } from 'lucide-react-native';

export default function SettingsScreen({ navigation }) {
  const { t, language, setLanguage } = useTranslation();
  const { themeMode, updateTheme, fontSize, updateFontSize } = useTheme();

  const handleThemeChange = () => {
    Alert.alert('Theme', 'Select Theme', [
      { text: 'System Default', onPress: () => updateTheme('system') },
      { text: 'Light', onPress: () => updateTheme('light') },
      { text: 'Dark', onPress: () => updateTheme('dark') },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const handleFontChange = () => {
    Alert.alert('Font Size', 'Select Font Size', [
      { text: 'Small', onPress: () => updateFontSize('small') },
      { text: 'Standard', onPress: () => updateFontSize('standard') },
      { text: 'Large', onPress: () => updateFontSize('large') },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const handleLanguageChange = () => {
    Alert.alert('Language', 'Select Language', [
      { text: 'English', onPress: () => setLanguage('en') },
      { text: 'हिंदी (Hindi)', onPress: () => setLanguage('hi') },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  return (
    <View style={styles.container}>
      <SLHeader title={t('profile.language') === 'Language' ? 'Settings' : 'सेटिंग्स'} navigation={navigation} />
      
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <TouchableOpacity style={styles.row} onPress={handleThemeChange}>
            <View style={styles.iconBox}><Moon size={20} color={theme.colors.primary} /></View>
            <Text style={styles.rowTitle}>Theme</Text>
            <Text style={styles.valueText}>{themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}</Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleFontChange}>
            <View style={styles.iconBox}><Type size={20} color={theme.colors.primary} /></View>
            <Text style={styles.rowTitle}>Font Size</Text>
            <Text style={styles.valueText}>{fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}</Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language & Preferences</Text>
          <TouchableOpacity style={styles.row} onPress={handleLanguageChange}>
            <View style={styles.iconBox}><Globe size={20} color={theme.colors.primary} /></View>
            <Text style={styles.rowTitle}>Language</Text>
            <Text style={styles.valueText}>{language === 'en' ? 'English' : 'हिंदी'}</Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.row}>
            <View style={styles.iconBox}><Bell size={20} color={theme.colors.primary} /></View>
            <Text style={styles.rowTitle}>Notifications</Text>
            <Text style={styles.valueText}>Enabled</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ChangePassword')}>
            <View style={styles.iconBox}><Lock size={20} color={theme.colors.primary} /></View>
            <Text style={styles.rowTitle}>{t('profile.changePassword') || 'Change Password'}</Text>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.row}>
            <View style={styles.iconBox}><Info size={20} color={theme.colors.primary} /></View>
            <Text style={styles.rowTitle}>App Version</Text>
            <Text style={styles.valueText}>1.0.0</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  section: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.xl, overflow: 'hidden' },
  sectionTitle: { ...theme.typography.label, padding: theme.spacing.md, backgroundColor: theme.colors.background },
  row: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border },
  iconBox: { marginRight: theme.spacing.md },
  rowTitle: { ...theme.typography.bodyMedium, flex: 1 },
  valueText: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary, marginRight: 8 },
});
