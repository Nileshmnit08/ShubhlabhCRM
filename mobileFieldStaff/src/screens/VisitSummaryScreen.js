import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded } from '../theme/tokens';
import { EmptyState } from '../components';

export function VisitSummaryScreen({ navigation, route }) {
  const visit = route.params?.visit;

  if (!visit) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState title="No Visit Data" message="Could not find visit data." icon="error-outline" />
      </SafeAreaView>
    );
  }

  const durationMin = Math.floor(visit.duration_seconds / 60);
  const durationSec = visit.duration_seconds % 60;
  
  const startTime = new Date(visit.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(visit.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Map true outcomes to array
  const capturedOutcomes = visit.outcomes ? Object.keys(visit.outcomes).filter(k => visit.outcomes[k]) : [];
  
  const hasRequirements = visit.requirements && visit.requirements.length > 0;
  const hasOutcomes = capturedOutcomes.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.replace('MainTabs')}>
            <MaterialIcons name="close" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerLogoText}>SHUBH LABH FIELD</Text>
            <Text style={styles.headerPageTitle}>Visit Summary</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Customer Context */}
        <View style={styles.customerBox}>
          <MaterialIcons name="check-circle" size={48} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={styles.visitCompleteText}>Visit Completed</Text>
          <Text style={styles.customerName}>{visit.customerName}</Text>
        </View>

        {/* Timing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TIME SPENT</Text>
          <View style={styles.timingCard}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Start</Text>
              <Text style={styles.timeValue}>{startTime}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>End</Text>
              <Text style={styles.timeValue}>{endTime}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Duration</Text>
              <Text style={styles.timeValue}>{durationMin}m {durationSec}s</Text>
            </View>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VISIT LOCATION</Text>
          <View style={styles.locCard}>
            <MaterialIcons name="my-location" size={20} color={colors.primary} />
            <Text style={styles.locText}>
              {visit.latitude && visit.longitude 
                ? `Captured GPS: ${visit.latitude.toFixed(5)}, ${visit.longitude.toFixed(5)}`
                : 'GPS Location Unavailable'}
            </Text>
          </View>
        </View>

        {/* Field Mobility Evidence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FIELD MOBILITY</Text>
          <View style={styles.locCard}>
            <MaterialIcons name="timeline" size={20} color={colors.onSurfaceVariant} />
            <Text style={styles.locText} style={[{flex: 1}, typography.bodyMd, {color: colors.onSurfaceVariant}]}>
              Mobility link unavailable
            </Text>
          </View>
        </View>

        {/* Captured Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CAPTURED FIELD WORK</Text>
          
          {/* Outcomes */}
          {hasOutcomes && (
            <View style={styles.activityBox}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8}}>
                <MaterialIcons name="flag" size={18} color={colors.onSurface} />
                <Text style={styles.activityTitle}>Visit Outcomes</Text>
              </View>
              <View style={styles.chipsRow}>
                {capturedOutcomes.map(out => (
                  <View key={out} style={styles.chip}>
                    <Text style={styles.chipText}>{out}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Requirements */}
          {hasRequirements && (
            <View style={styles.activityBox}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8}}>
                <MaterialIcons name="bolt" size={18} color={colors.onSurface} />
                <Text style={styles.activityTitle}>Requirements Captured</Text>
              </View>
              {visit.requirements.map((req, idx) => (
                <View key={req.id || idx} style={styles.reqRow}>
                  <Text style={styles.reqText}>{req.quantity} {req.product_type}</Text>
                  <Text style={styles.reqDate}>Delivery: {req.expected_date}</Text>
                </View>
              ))}
            </View>
          )}

          {!hasOutcomes && !hasRequirements && (
            <Text style={styles.noActivityText}>No specific activities recorded.</Text>
          )}
        </View>

        {/* Synchronization State */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYNCHRONIZATION</Text>
          <View style={styles.syncCard}>
            <MaterialIcons name="cloud-queue" size={20} color={colors.onSurfaceVariant} />
            <Text style={styles.syncText}>Queued for sync via SyncService</Text>
          </View>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace('MainTabs')}>
          <Text style={styles.primaryBtnText}>RETURN TO DASHBOARD</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, backgroundColor: colors.surfaceContainerLowest },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitleBox: { flexDirection: 'col' },
  headerLogoText: { ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  headerPageTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  
  container: { padding: 16, paddingBottom: 100 },
  customerBox: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  visitCompleteText: { ...typography.labelLg, color: colors.primary, fontWeight: 'bold', letterSpacing: 1 },
  customerName: { ...typography.displaySm, color: colors.onSurface, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
  
  section: { marginBottom: 24 },
  sectionTitle: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  
  timingCard: { flexDirection: 'row', backgroundColor: colors.surfaceContainerLowest, borderRadius: rounded.default, padding: 16, elevation: 1 },
  timeBlock: { flex: 1, alignItems: 'center' },
  timeLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  timeValue: { ...typography.titleMd, fontWeight: 'bold', color: colors.onSurface, marginTop: 4 },
  timeDivider: { width: 1, backgroundColor: colors.outlineVariant },
  
  locCard: { flexDirection: 'row', backgroundColor: colors.surfaceContainerLowest, borderRadius: rounded.default, padding: 16, alignItems: 'center', gap: 12, elevation: 1 },
  locText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  
  activityBox: { backgroundColor: colors.surfaceContainerLowest, borderRadius: rounded.default, padding: 16, marginBottom: 12, elevation: 1 },
  activityTitle: { ...typography.titleSm, fontWeight: 'bold', color: colors.onSurface },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#eff4ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#d0dfff' },
  chipText: { ...typography.labelMd, color: '#00468c' },
  
  reqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  reqText: { ...typography.bodyMd, fontWeight: '600', color: colors.onSurface },
  reqDate: { ...typography.bodySm, color: colors.onSurfaceVariant },
  
  noActivityText: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontStyle: 'italic', marginLeft: 4 },
  
  syncCard: { flexDirection: 'row', backgroundColor: '#f8f9fa', borderRadius: rounded.default, padding: 16, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.outlineVariant },
  syncText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.surfaceContainerLowest, borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  primaryBtn: { height: 56, backgroundColor: colors.primary, borderRadius: rounded.full, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  primaryBtnText: { ...typography.labelLg, fontWeight: 'bold', color: colors.onPrimary }
});
