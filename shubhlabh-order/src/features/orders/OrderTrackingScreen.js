import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { useTranslation } from '../../shared/localization/i18n';
import { SLCard } from '../../shared/components/SLCard';
import { CheckCircle, Clock, Truck, PackageCheck } from 'lucide-react-native';

export default function OrderTrackingScreen({ navigation }) {
  const { t } = useTranslation();

  const steps = [
    { title: t('track.confirmed'), active: true, done: true, icon: CheckCircle },
    { title: t('track.processing'), active: true, done: true, icon: Clock },
    { title: t('track.inTransit'), active: true, done: false, icon: Truck },
    { title: t('track.delivered'), active: false, done: false, icon: PackageCheck },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader title={t('order.trackOrder')} navigation={navigation} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <SLCard style={styles.summaryCard}>
          <Text style={styles.label}>{t('order.number')}</Text>
          <Text style={styles.value}>ORD-9921</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>{t('order.expectedDispatch')}</Text>
          <Text style={styles.value}>Tomorrow, 10:00 AM</Text>
        </SLCard>

        <View style={styles.timeline}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            const color = step.done ? theme.colors.green : (step.active ? theme.colors.primary : theme.colors.disabled);
            return (
              <View key={index} style={styles.stepRow}>
                <View style={styles.iconCol}>
                  <Icon size={28} color={color} />
                  {index < steps.length - 1 && (
                    <View style={[styles.line, { backgroundColor: step.done ? theme.colors.green : theme.colors.border }]} />
                  )}
                </View>
                <View style={styles.textCol}>
                  <Text style={[styles.stepTitle, { color: step.active ? theme.colors.text : theme.colors.disabled }]}>
                    {step.title}
                  </Text>
                  {step.active && step.done && <Text style={styles.stepDate}>Today, 09:30 AM</Text>}
                  {step.active && !step.done && <Text style={styles.stepDate}>In Progress...</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.xl },
  summaryCard: { marginBottom: theme.spacing.xl * 1.5 },
  label: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary },
  value: { ...theme.typography.h3, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.md },
  
  timeline: { paddingHorizontal: theme.spacing.sm },
  stepRow: { flexDirection: 'row', minHeight: 80 },
  iconCol: { width: 40, alignItems: 'center' },
  line: { flex: 1, width: 2, marginVertical: 4 },
  textCol: { flex: 1, paddingTop: 4, paddingLeft: theme.spacing.md },
  stepTitle: { ...theme.typography.h3 },
  stepDate: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginTop: 4 },
});
