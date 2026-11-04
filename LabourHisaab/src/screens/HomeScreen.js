// HomeScreen for LabourHisaab
// High-fidelity matching with user reference UI snapshot (Screen 1)
// Orange Gradient Header with Wheat Logo, Date Card, 2 Green KPI Cards, 10 Work Categories Grid

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import {
  Calendar,
  Users,
  Wallet,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Truck,
  RotateCw,
  FlaskConical,
  Wheat,
  Scissors,
  Package,
  Edit2,
} from 'lucide-react-native';
import theme from '../constants/theme';
import { DEFAULT_WORK_RATES } from '../constants/initialData';
import { useLabourHisaab } from '../context/LabourHisaabContext';
import { formatRupees } from '../utils/shareWhatsApp';
import {
  todayYmd, formatHindiDate, formatHindiMonth, monthOf, shiftMonth, monthGrid, HINDI_WEEKDAYS_SHORT,
} from '../utils/dates';

export default function HomeScreen({ navigation }) {
  const {
    selectedDate,
    setSelectedDate,
    todayMetrics,
    workEntries,
    deleteWorkEntry,
    storageError,
    isCloudConfigured,
    cloudUser,
    syncStatus,
  } = useLabourHisaab();

  // LH-HOME-TOTAL-DATE-01: the date card opens a calendar; the chosen date drives the
  // entry list, the wage total and every new entry (AddWorkEntry saves with selectedDate).
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthOf(selectedDate));
  const today = todayYmd();
  const isToday = selectedDate === today;

  const openDatePicker = () => {
    setVisibleMonth(monthOf(selectedDate));
    setDatePickerOpen(true);
  };
  const chooseDate = (ymd) => {
    setSelectedDate(ymd);
    setDatePickerOpen(false);
  };

  // Work entries of the selected date — the same set the wage total is computed from.
  const todayWorkList = workEntries.filter(e => e.date === selectedDate);

  // Map icon component for each work category
  const renderWorkIcon = (catId) => {
    switch (catId) {
      case 'mix':
        return <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}><Text style={styles.iconEmoji}>⚙️</Text></View>;
      case 'pallet':
        return <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}><Text style={styles.iconEmoji}>🥔</Text></View>;
      case 'maize_daliya':
        return <View style={[styles.iconCircle, { backgroundColor: '#FEF9C3' }]}><Text style={styles.iconEmoji}>🌽</Text></View>;
      case 'maize_flour':
        return <View style={[styles.iconCircle, { backgroundColor: '#FEF08A' }]}><Text style={styles.iconEmoji}>🥣</Text></View>;
      case 'chana_churi':
        return <View style={[styles.iconCircle, { backgroundColor: '#FFEDD5' }]}><Text style={styles.iconEmoji}>🫘</Text></View>;
      case 'unloading_weight':
        return <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}><Text style={styles.iconEmoji}>🚚</Text></View>;
      case 'unloading_bag':
        return <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}><Text style={styles.iconEmoji}>🛒</Text></View>;
      case 'bag_stitching':
        return <View style={[styles.iconCircle, { backgroundColor: '#FFE4E6' }]}><Text style={styles.iconEmoji}>🧵</Text></View>;
      case 'material_transfer':
        return <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}><Text style={styles.iconEmoji}>🔄</Text></View>;
      case 'premix':
        return <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}><Text style={styles.iconEmoji}>🧪</Text></View>;
      default:
        return <View style={[styles.iconCircle, { backgroundColor: '#F1F5F9' }]}><Package size={22} color="#64748B" /></View>;
    }
  };

  const handleSelectWorkCategory = (cat) => {
    navigation.navigate('AddWorkEntryModal', { preselectedCategoryId: cat.id });
  };

  return (
    <View style={styles.container}>
      {/* 1. ORANGE BRAND HEADER */}
      <View style={styles.header}>
        <View style={styles.headerBrandRow}>
          {/* Wheat Stalk in Circular Badge */}
          <View style={styles.wheatBadge}>
            <Text style={styles.wheatEmoji}>🌾</Text>
          </View>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitleTop}>शुभ लाभ</Text>
            <Text style={styles.headerTitleBottom}>लेबर हिसाब</Text>
          </View>
        </View>

        {/* Settings Gear Icon */}
        <TouchableOpacity
          style={styles.settingsCircle}
          onPress={() => navigation.navigate('SettingsModal')}
          activeOpacity={0.8}
        >
          <Settings size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* LH-PERSISTENCE-FIX-01: a failed load is shown, never presented as an empty day. */}
        {storageError ? (
          <View style={styles.storageErrorBox} accessibilityLiveRegion="polite">
            <Text style={styles.storageErrorText}>{storageError}</Text>
          </View>
        ) : null}

        {/* LH-REALTIME-WORK-SAVE-03: never let phone-only entries look like database records. */}
        {isCloudConfigured && workEntries.length > 0 && (!cloudUser || syncStatus.pending > 0 || syncStatus.lastError) ? (
          <TouchableOpacity style={styles.syncWarnBox} onPress={() => navigation.navigate('SettingsTab')} accessibilityLiveRegion="polite">
            <Text style={styles.syncWarnText}>
              {!cloudUser
                ? 'प्रविष्टियाँ केवल इस फ़ोन पर हैं — CRM में भेजने के लिए सेटिंग्स में साइन इन करें।'
                : syncStatus.pending > 0
                  ? `${syncStatus.pending} प्रविष्टि डेटाबेस में नहीं गई (Not synced — waiting for connection)${syncStatus.lastError ? `: ${syncStatus.lastError}` : ''}`
                  : `सिंक त्रुटि: ${syncStatus.lastError}`}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* 2. DATE SELECTOR CARD */}
        <TouchableOpacity
          style={styles.dateCard}
          onPress={openDatePicker}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`तारीख बदलें: ${formatHindiDate(selectedDate)}`}
        >
          <View style={styles.dateIconBox}>
            <Calendar size={20} color="#EE5A00" />
          </View>
          <View style={styles.dateTextBox}>
            <Text style={styles.dateSubLabel}>{isToday ? 'आज की तारीख' : 'चुनी गई तारीख'}</Text>
            <Text style={styles.dateMainLabel}>{formatHindiDate(selectedDate)}</Text>
          </View>
          <ChevronDown size={20} color="#64748B" />
        </TouchableOpacity>
        {!isToday && (
          <TouchableOpacity style={styles.backToToday} onPress={() => setSelectedDate(today)} activeOpacity={0.8}>
            <Text style={styles.backToTodayText}>आज की तारीख पर लौटें ({formatHindiDate(today)})</Text>
          </TouchableOpacity>
        )}

        <Modal visible={datePickerOpen} transparent animationType="fade" onRequestClose={() => setDatePickerOpen(false)}>
          <View style={styles.pickerBackdrop}>
            <View style={styles.pickerCard}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setVisibleMonth(m => shiftMonth(m, -1))} style={styles.pickerNav} accessibilityLabel="पिछला महीना">
                  <ChevronLeft size={22} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.pickerMonth}>{formatHindiMonth(visibleMonth.year, visibleMonth.month)}</Text>
                <TouchableOpacity onPress={() => setVisibleMonth(m => shiftMonth(m, 1))} style={styles.pickerNav} accessibilityLabel="अगला महीना">
                  <ChevronRight size={22} color="#1E293B" />
                </TouchableOpacity>
              </View>
              <View style={styles.pickerWeekRow}>
                {HINDI_WEEKDAYS_SHORT.map((w) => <Text key={w} style={styles.pickerWeekday}>{w}</Text>)}
              </View>
              {monthGrid(visibleMonth.year, visibleMonth.month).map((week, wi) => (
                <View key={wi} style={styles.pickerWeekRow}>
                  {week.map((ymd, di) => (
                    ymd ? (
                      <TouchableOpacity
                        key={ymd}
                        style={[styles.pickerDay, ymd === selectedDate && styles.pickerDaySelected, ymd === today && ymd !== selectedDate && styles.pickerDayToday]}
                        onPress={() => chooseDate(ymd)}
                        accessibilityLabel={formatHindiDate(ymd)}
                      >
                        <Text style={[styles.pickerDayText, ymd === selectedDate && styles.pickerDayTextSelected]}>{Number(ymd.slice(8))}</Text>
                      </TouchableOpacity>
                    ) : <View key={`b${wi}-${di}`} style={styles.pickerDay} />
                  ))}
                </View>
              ))}
              <View style={styles.pickerActions}>
                <TouchableOpacity onPress={() => chooseDate(today)} style={styles.pickerTodayBtn}>
                  <Text style={styles.pickerTodayText}>आज</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDatePickerOpen(false)} style={styles.pickerCancelBtn}>
                  <Text style={styles.pickerCancelText}>रद्द करें</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 3. TWO FOREST GREEN KPI CARDS */}
        <View style={styles.kpiRow}>
          {/* Card 1: Total Labourers */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => navigation.navigate('LabourTab')}
            activeOpacity={0.9}
          >
            <View style={styles.kpiIconWrap}>
              <Users size={26} color="#FFFFFF" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={styles.kpiLabel}>{isToday ? 'आज कुल मजदूर' : 'इस दिन कुल मजदूर'}</Text>
              {/* Distinct labourers with work on the selected date (not the registered roster). */}
              <Text style={styles.kpiValue}>{Number(todayMetrics.workingLabourersCount) || 0}</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Today's Labour Earned */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => navigation.navigate('ReportsTab')}
            activeOpacity={0.9}
          >
            <View style={styles.kpiIconWrap}>
              <Wallet size={26} color="#FFFFFF" />
            </View>
            <View style={styles.kpiTextCol}>
              <Text style={styles.kpiLabel}>{isToday ? 'आज की कुल मजदूरी' : 'इस दिन की कुल मजदूरी'}</Text>
              {/* Sum of the selected date's saved entry amounts only; ₹0 stays ₹0 (no sample fallback). */}
              <Text style={styles.kpiValue}>
                ₹ {(Number(todayMetrics.todayLabourEarned) || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. SECTION HEADING */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{isToday ? 'आज का काम दर्ज करें' : `${formatHindiDate(selectedDate)} का काम दर्ज करें`}</Text>
        </View>

        {/* 5. 10 WORK CATEGORIES IN 2-COLUMN GRID */}
        <View style={styles.workGrid}>
          {DEFAULT_WORK_RATES.slice(0, 10).map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.workCard}
              onPress={() => handleSelectWorkCategory(cat)}
              activeOpacity={0.8}
            >
              {renderWorkIcon(cat.id)}
              <Text style={styles.workCardTitle}>{cat.name}</Text>
              <View style={styles.ratePill}>
                <Text style={styles.ratePillText}>{cat.unitLabel}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 6. TODAY'S RECORDED SUMMARY (Quick Peek & Edit) */}
        {todayWorkList.length > 0 && (
          <View style={styles.todayRecordedSection}>
            <Text style={styles.recordedSectionTitle}>{isToday ? 'आज की' : 'इस दिन की'} दर्ज प्रविष्टियां ({todayWorkList.length})</Text>
            {todayWorkList.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.recordedEntryRow}
                onPress={() => navigation.navigate('AddWorkEntryModal', { workEntryToEdit: entry })}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordedEntryName}>{entry.categoryName}</Text>
                  <Text style={styles.recordedEntryDetail}>
                    {entry.type === 'weight' && `${entry.totalKg} kg (${entry.totalBags} बोरी)`}
                    {entry.type === 'bag' && `${entry.totalBags} बोरी`}
                    {entry.type === 'batch' && `${entry.totalBatches} बैच`}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.recordedEntryAmount}>{formatRupees(entry.totalAmount)}</Text>
                  <Edit2 size={14} color="#64748B" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    backgroundColor: '#F57C00', // Reference Orange
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wheatBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  wheatEmoji: {
    fontSize: 22,
  },
  headerTitleCol: {
    flexDirection: 'column',
  },
  headerTitleTop: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerTitleBottom: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginTop: -2,
  },
  settingsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dateIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF2E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateTextBox: {
    flex: 1,
  },
  dateSubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  dateMainLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 1,
  },
  storageErrorBox: {
    backgroundColor: '#FEE4E2',
    borderColor: '#F5B5AF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  storageErrorText: { fontSize: 13, fontWeight: '700', color: '#B42318' },
  syncWarnBox: { backgroundColor: '#FFFAEB', borderColor: '#FEDF89', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12 },
  syncWarnText: { fontSize: 12, fontWeight: '700', color: '#B54708' },
  backToToday: {
    alignSelf: 'flex-start',
    marginTop: -6,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#FFF2E6',
  },
  backToTodayText: { fontSize: 12, fontWeight: '700', color: '#C94700' },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pickerNav: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F1EC' },
  pickerMonth: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  pickerWeekRow: { flexDirection: 'row' },
  pickerWeekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#64748B', paddingVertical: 6 },
  pickerDay: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999, margin: 2 },
  pickerDaySelected: { backgroundColor: '#EE5A00' },
  pickerDayToday: { borderWidth: 1.5, borderColor: '#EE5A00' },
  pickerDayText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  pickerDayTextSelected: { color: '#FFFFFF', fontWeight: '800' },
  pickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  pickerTodayBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#FFF2E6' },
  pickerTodayText: { fontSize: 14, fontWeight: '800', color: '#C94700' },
  pickerCancelBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#F3F1EC' },
  pickerCancelText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#137A38', // Dark Forest Green
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#0F5C28',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTextCol: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  sectionHeaderRow: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  workGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  workCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0ECE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconEmoji: {
    fontSize: 24,
  },
  workCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  ratePill: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAE6DC',
  },
  ratePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  todayRecordedSection: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  recordedSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  recordedEntryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3EF',
  },
  recordedEntryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  recordedEntryDetail: {
    fontSize: 10,
    color: '#64748B',
  },
  recordedEntryAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#137A38',
  },
});
