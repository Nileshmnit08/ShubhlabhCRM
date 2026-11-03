// EmptyState Component for lists with no entries

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Inbox, Plus } from 'lucide-react-native';
import theme from '../constants/theme';

export default function EmptyState({
  title = 'कोई प्रविष्टि नहीं मिली',
  subtitle = 'अभी तक कोई रिकॉर्ड दर्ज नहीं किया गया है',
  buttonText,
  onPressButton,
  icon: Icon = Inbox,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon size={36} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {buttonText && onPressButton && (
        <TouchableOpacity style={styles.button} onPress={onPressButton} activeOpacity={0.8}>
          <Plus size={18} color="#FFF" />
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginVertical: theme.spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

