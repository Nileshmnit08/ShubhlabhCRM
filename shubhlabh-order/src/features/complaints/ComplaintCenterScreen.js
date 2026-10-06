import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { useTranslation } from '../../shared/localization/i18n';
import { ChevronRight, PhoneCall, Package, Truck, Wallet } from 'lucide-react-native';

export default function ComplaintCenterScreen({ navigation }) {
  const { t } = useTranslation();

  const categories = [
    { title: 'Order Issue', icon: Package },
    { title: 'Delivery Delay', icon: Truck },
    { title: 'Payment Issue', icon: Wallet },
    { title: 'Other Support', icon: PhoneCall },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader title={t('support.title')} navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Select Category</Text>
        
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <TouchableOpacity key={i} style={styles.row}>
              <View style={styles.iconBox}>
                <Icon size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.rowTitle}>{cat.title}</Text>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md },
  sectionTitle: { ...theme.typography.h3, marginBottom: theme.spacing.md, marginTop: theme.spacing.sm },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: theme.spacing.md, 
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconBox: { marginRight: theme.spacing.md },
  rowTitle: { ...theme.typography.bodyLarge, flex: 1 },
});
