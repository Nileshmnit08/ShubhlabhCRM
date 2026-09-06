import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { Globe, Save } from 'lucide-react-native';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: theme.spacing.md }}>
      
      <Text style={styles.header}>{t('settings.title')}</Text>

      <Card>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <Text style={styles.subText}>Current: {i18n.language === 'en' ? t('settings.english') : t('settings.hindi')}</Text>
        
        <Button 
          title={`Switch to ${i18n.language === 'en' ? t('settings.hindi') : t('settings.english')}`}
          icon={Globe}
          onPress={toggleLanguage}
          style={{ marginTop: theme.spacing.md }}
        />
      </Card>

      <Text style={styles.header}>Component Gallery (Design System)</Text>

      <Card>
        <Text style={styles.sectionTitle}>Buttons</Text>
        <View style={styles.row}>
          <Button title="Primary" style={styles.flexBtn} />
          <Button title="Danger" variant="danger" style={styles.flexBtn} />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Inputs</Text>
        <Input label="Sample Input" placeholder="Type here..." />
        <Input label="Error Input" value="Invalid data" error="This field is required" />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Badges</Text>
        <View style={styles.row}>
          <Badge label="Active" status="success" />
          <Badge label="Pending" status="warning" />
          <Badge label="Failed" status="danger" />
          <Badge label="Draft" />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Empty State</Text>
        <View style={{ height: 200 }}>
          <EmptyState title={t('common.no_data')} description="Demonstration of the empty state component." />
        </View>
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.sm,
  },
  subText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  flexBtn: {
    flex: 1,
  }
});
