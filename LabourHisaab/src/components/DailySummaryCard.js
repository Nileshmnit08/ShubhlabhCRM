// Daily Labour Summary (LH-DAILY-REGISTER-APPROVAL-01), shown in Settings.
// One business date at a time (default today): entries in time order, real totals, the sync
// state of each entry and the day's Shubh Labh CRM approval status. Read-only here.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react-native';
import theme from '../constants/theme';
import { useLabourHisaab } from '../context/LabourHisaabContext';
import { todayYmd, addDaysYmd, formatHindiDate } from '../utils/dates';
import { buildDailyRegister, formatIstTime, formatIstDateTime, SYNC_LABELS } from '../utils/dailyRegister';
import { formatRupees } from '../utils/shareWhatsApp';

const quantityText = (r) => (r.unit === 'per_100_kg' ? `${r.totalKg.toLocaleString('en-IN')} kg (${r.totalBags} बोरी)`
  : r.unit === 'per_bag' ? `${r.totalBags} बोरी`
  : r.unit === 'per_batch' ? `${r.totalBatches} बैच` : 'फिक्स राशि');

const SYNC_COLORS = { device: theme.colors.textSecondary, pending: theme.colors.warning, synced: theme.colors.success, failed: theme.colors.danger };
const APPROVAL_STYLE = {
  Pending: { bg: theme.colors.warningLight, fg: theme.colors.warning },
  Approved: { bg: theme.colors.successLight, fg: theme.colors.success },
  Rejected: { bg: theme.colors.dangerLight, fg: theme.colors.danger },
};

export default function DailySummaryCard() {
  const { workEntries, syncItems, registers, syncStatus, cloudUser, syncNow, isCloudConfigured } = useLabourHisaab();
  const today = todayYmd();
  const [date, setDate] = useState(today);
  const signedIn = Boolean(isCloudConfigured && cloudUser);

  const register = useMemo(() => buildDailyRegister({
    entries: workEntries, date, syncItems, failed: syncStatus.failed || [], registers, signedIn,
  }), [workEntries, date, syncItems, syncStatus.failed, registers, signedIn]);

  // Dates that have saved work, newest first (to jump to any past day).
  const workDates = useMemo(() => [...new Set(workEntries.map(e => e.date))].sort().reverse().slice(0, 30), [workEntries]);
  const ap = register.approval;
  const apStyle = APPROVAL_STYLE[ap.status];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <CalendarDays size={18} color={theme.colors.primary} />
        <Text style={styles.title}>दैनिक लेबर सारांश (Daily Labour Summary)</Text>
      </View>

      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setDate(addDaysYmd(date, -1))} accessibilityLabel="पिछला दिन">
          <ChevronLeft size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatHindiDate(date)}</Text>
        <TouchableOpacity style={[styles.navBtn, date >= today && { opacity: 0.4 }]} disabled={date >= today}
          onPress={() => setDate(addDaysYmd(date, 1))} accessibilityLabel="अगला दिन">
          <ChevronRight size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        {date !== today ? (
          <TouchableOpacity style={styles.todayBtn} onPress={() => setDate(today)}><Text style={styles.todayText}>आज</Text></TouchableOpacity>
        ) : null}
      </View>
      {workDates.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {workDates.map(d => (
            <TouchableOpacity key={d} onPress={() => setDate(d)} style={[styles.chip, d === date && styles.chipOn]}>
              <Text style={[styles.chipText, d === date && styles.chipTextOn]}>{d.slice(8, 10)}/{d.slice(5, 7)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <View style={[styles.approval, { backgroundColor: apStyle.bg }]}>
        <Text style={[styles.approvalText, { color: apStyle.fg }]}>{ap.label}</Text>
        {ap.decidedAt ? <Text style={styles.small}>निर्णय: {formatIstDateTime(ap.decidedAt)}</Text> : null}
        {ap.status === 'Rejected' ? (
          <>
            <Text style={[styles.small, { color: theme.colors.danger }]}>कारण: {ap.reason || '—'}</Text>
            <Text style={styles.small}>{ap.nextStep}</Text>
          </>
        ) : null}
        {ap.status === 'Pending' && register.rows.length && !ap.onServer ? (
          <Text style={styles.small}>{signedIn ? 'सिंक के बाद यह दिन CRM में स्वीकृति के लिए दिखेगा।' : 'CRM स्वीकृति के लिए क्लाउड सिंक में साइन इन करें।'}</Text>
        ) : null}
      </View>

      {register.rows.length === 0 ? (
        <Text style={styles.empty}>इस तारीख को कोई काम दर्ज नहीं है। (No work recorded for this date.)</Text>
      ) : (
        <>
          {register.rows.map((r, i) => (
            <View key={r.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{i + 1}. {r.workType}</Text>
                <Text style={styles.small}>
                  काम पूरा: {r.completedAt ? formatIstTime(r.completedAt) : '—'}  ·  दर्ज: {r.recordedAt ? formatIstTime(r.recordedAt) : '—'} IST
                </Text>
                <Text style={styles.small}>{quantityText(r)}  ·  {r.labourCount} मजदूर</Text>
                <Text style={[styles.small, { color: SYNC_COLORS[r.sync] }]}>{SYNC_LABELS[r.sync]}</Text>
              </View>
              <Text style={styles.amount}>{formatRupees(r.amount)}</Text>
            </View>
          ))}
          <View style={styles.totals}>
            <Text style={styles.totalText}>कुल: {register.totals.entries} काम · {register.totals.labourers} मजदूर</Text>
            <Text style={styles.totalAmount}>{formatRupees(register.totals.amount)}</Text>
          </View>
        </>
      )}

      {signedIn ? (
        <TouchableOpacity style={[styles.refresh, syncStatus.running && { opacity: 0.6 }]} disabled={syncStatus.running} onPress={() => syncNow()}>
          <RefreshCw size={14} color="#FFF" />
          <Text style={styles.refreshText}>{syncStatus.running ? 'सिंक चल रहा है...' : (register.syncCounts.failed || register.syncCounts.pending) ? 'दोबारा सिंक करें (Retry sync)' : 'ताज़ा करें (Refresh)'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.surfaceBorder, marginBottom: theme.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 13, fontWeight: '800', color: theme.colors.textPrimary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  navBtn: { padding: 6, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surfaceVariant },
  dateText: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primaryLight },
  todayText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: theme.colors.surfaceVariant, marginRight: 6 },
  chipOn: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 11, color: theme.colors.textPrimary },
  chipTextOn: { color: '#FFF', fontWeight: '700' },
  approval: { borderRadius: theme.borderRadius.md, padding: 8, marginBottom: 8 },
  approvalText: { fontSize: 12, fontWeight: '800' },
  empty: { fontSize: 12, color: theme.colors.textSecondary, paddingVertical: 10, textAlign: 'center' },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceBorder, gap: 8 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },
  small: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  amount: { fontSize: 13, fontWeight: '800', color: theme.colors.textPrimary },
  totals: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  totalText: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary },
  totalAmount: { fontSize: 14, fontWeight: '800', color: theme.colors.primary },
  refresh: { marginTop: 10, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, paddingVertical: 10 },
  refreshText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
