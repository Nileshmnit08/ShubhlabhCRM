import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, elevation, rounded } from '../theme/tokens';

export function SchemeDetailScreen({ route, navigation }) {
  const { scheme } = route.params || {};

  if (!scheme) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Scheme details unavailable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scheme Details</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroBox}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="emoji-events" size={48} color="#904d00" />
          </View>
          <Text style={styles.schemeName}>{scheme.name}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{scheme.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VALIDITY</Text>
          <View style={[styles.card, elevation.level1]}>
            <View style={styles.row}>
              <MaterialIcons name="event" size={20} color={colors.primary} />
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>Starts</Text>
                <Text style={styles.rowValue}>{scheme.start_date || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <MaterialIcons name="event-busy" size={20} color={colors.error} />
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>Ends</Text>
                <Text style={styles.rowValue}>{scheme.end_date || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BENEFIT & DESCRIPTION</Text>
          <View style={[styles.card, elevation.level1]}>
            <Text style={styles.bodyText}>{scheme.description || 'No description provided.'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ELIGIBILITY</Text>
          <View style={[styles.card, elevation.level1]}>
            <Text style={styles.bodyText}>{scheme.eligibility_criteria || 'Open to all.'}</Text>
            
            {scheme.customer_type && (
              <View style={styles.tagRow}>
                <View style={styles.tag}><Text style={styles.tagText}>{scheme.customer_type}</Text></View>
                {scheme.territory_eligibility && (
                  <View style={styles.tag}><Text style={styles.tagText}>{scheme.territory_eligibility}</Text></View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.disclaimerBox}>
          <MaterialIcons name="info-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.disclaimerText}>This information is for customer explanation purposes only. Actual reward calculations and payouts are subject to authoritative billing data and company terms.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: 'rgba(248, 249, 255, 0.9)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { ...typography.bodyLg, color: colors.onSurfaceVariant },
  container: { padding: 16, paddingBottom: 40 },
  heroBox: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff4e5', alignItems: 'center', justifyContent: 'center', marginBottom: 16, elevation: 2 },
  schemeName: { ...typography.displaySm, fontWeight: 'bold', color: colors.onSurface, textAlign: 'center', marginBottom: 12 },
  statusBadge: { backgroundColor: '#dce9ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  statusText: { ...typography.labelSm, color: colors.primary, fontWeight: 'bold', textTransform: 'uppercase' },
  section: { marginBottom: 24 },
  sectionTitle: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#ffffff', borderRadius: rounded.lg, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  rowTextContainer: { flex: 1 },
  rowLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  rowValue: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  bodyText: { ...typography.bodyLg, color: colors.onSurface, lineHeight: 24 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  tag: { backgroundColor: colors.surfaceContainerLowest, paddingHorizontal: 12, paddingVertical: 6, borderRadius: rounded.sm, borderWidth: 1, borderColor: '#E2E8F0' },
  tagText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  disclaimerBox: { flexDirection: 'row', gap: 8, backgroundColor: '#fff8f6', padding: 16, borderRadius: rounded.md, borderWidth: 1, borderColor: '#ffd8cf' },
  disclaimerText: { flex: 1, ...typography.bodySm, color: '#93000a', lineHeight: 20 }
});
