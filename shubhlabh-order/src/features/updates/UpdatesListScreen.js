import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { useTranslation } from '../../shared/localization/i18n';
import { SLCard } from '../../shared/components/SLCard';

export default function UpdatesListScreen({ navigation }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('All'); // All, Schemes, Products

  const updates = [
    { type: 'Schemes', title: 'Diwali Mega Offer', desc: '10% extra discount on minimum order of 100 bags.', date: 'Today' },
    { type: 'Products', title: 'New Shubh Labh Premium 50kg', desc: 'Now available in stock. Order today!', date: 'Yesterday' },
  ];

  const filtered = tab === 'All' ? updates : updates.filter(u => u.type === tab);

  const TabButton = ({ label, value }) => (
    <TouchableOpacity 
      style={[styles.tab, tab === value && styles.activeTab]}
      onPress={() => setTab(value)}
    >
      <Text style={[styles.tabText, tab === value && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader title={t('updates.title')} navigation={navigation} />
      
      <View style={styles.tabContainer}>
        <TabButton label={t('updates.all')} value="All" />
        <TabButton label={t('updates.schemes')} value="Schemes" />
        <TabButton label={t('updates.newProducts')} value="Products" />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.map((u, i) => (
          <SLCard key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.badge}>{u.type}</Text>
              <Text style={styles.date}>{u.date}</Text>
            </View>
            <Text style={styles.title}>{u.title}</Text>
            <Text style={styles.desc}>{u.desc}</Text>
          </SLCard>
        ))}
        {filtered.length === 0 && (
          <Text style={styles.empty}>No updates found.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  tabContainer: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { flex: 1, paddingVertical: theme.spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: theme.colors.primary },
  tabText: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary },
  activeTabText: { color: theme.colors.primary, fontWeight: 'bold' },
  
  content: { padding: theme.spacing.md },
  card: { padding: theme.spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  badge: { ...theme.typography.bodySmall, color: theme.colors.green, fontWeight: 'bold', textTransform: 'uppercase' },
  date: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  title: { ...theme.typography.h3, marginBottom: theme.spacing.xs },
  desc: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary },
  empty: { textAlign: 'center', color: theme.colors.textSecondary, marginTop: 40 },
});
