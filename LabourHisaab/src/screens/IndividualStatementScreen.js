// IndividualStatementScreen for LabourHisaab
// High-fidelity matching with user reference UI snapshot (Screen 3)
// Dynamically connected to saved database records (LH-LEDGER-01)
// Displays: Month Selector, Labourer Selector with Dropdown, 3 Sub-Tabs [मासिक सारांश | दैनिक विवरण | काम विवरण],
// 2 Stat Boxes (कार्य दिवस, कुल वजन), Earned Banner (₹ 28,040), Deductions Breakdown,
// Reconciliation Card with Negative Balance (- ₹ 1,060), and WhatsApp & PDF Actions

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Scale,
  Sigma,
  Wallet,
  Utensils,
  Bus,
  MessageCircle,
  FileText,
  Check,
} from 'lucide-react-native';
import theme from '../constants/theme';
import WhatsAppShareModal from '../components/WhatsAppShareModal';
import PdfPreviewModal from '../components/PdfPreviewModal';
import { useLabourHisaab } from '../context/LabourHisaabContext';
import { formatRupees } from '../utils/shareWhatsApp';

const AVAILABLE_MONTHS = [
  { id: '2026-10', label: 'अक्टूबर 2026' },
  { id: '2026-11', label: 'नवम्बर 2026' },
  { id: '2026-09', label: 'सितम्बर 2026' },
];

export default function IndividualStatementScreen({ route, navigation }) {
  const initialLabourerId = route?.params?.labourerId || 'LH_LAB_001';

  const {
    labourers,
    contractorName,
    selectedMonth,
    setSelectedMonth,
    workEntries,
    payments,
    serviceExpenses,
  } = useLabourHisaab();

  const [currentLabourerId, setCurrentLabourerId] = useState(initialLabourerId);
  const [activeSubTab, setActiveSubTab] = useState('monthly_summary'); // 'monthly_summary' | 'daily' | 'work'
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showLabourerPicker, setShowLabourerPicker] = useState(false);

  // Current labourer profile
  const labourer = useMemo(() => {
    return labourers.find(l => l.id === currentLabourerId) || labourers[0] || {
      id: 'LH_LAB_001',
      name: 'गोलू',
      role: 'मजदूर',
    };
  }, [labourers, currentLabourerId]);

  const currentMonthLabel = useMemo(() => {
    return AVAILABLE_MONTHS.find(m => m.id === selectedMonth)?.label || selectedMonth;
  }, [selectedMonth]);

  // Dynamically compute ledger metrics from saved database records
  const dynamicStatement = useMemo(() => {
    const monthWork = workEntries.filter(e => {
      const isMonth = (e.date || '').startsWith(selectedMonth);
      const isParticipant = !e.participatingLabourerIds || e.participatingLabourerIds.includes(currentLabourerId);
      return isMonth && isParticipant;
    });

    const monthPayments = payments.filter(p => {
      return (p.date || '').startsWith(selectedMonth) && p.labourerId === currentLabourerId;
    });

    const monthExpenses = serviceExpenses.filter(exp => {
      if (exp.allocationType === 'contractor_expense') return false;
      const isMonth = (exp.date || '').startsWith(selectedMonth);
      const isAllocated = (exp.allocatedLabourerIds || []).includes(currentLabourerId);
      return isMonth && isAllocated;
    });

    // 1. Working Days
    const workingDaysSet = new Set();
    let totalWeight = 0;
    let earned = 0;

    monthWork.forEach(e => {
      workingDaysSet.add(e.date);
      totalWeight += (Number(e.totalWeightKg || e.totalKg) || 0);

      const participants = e.participatingLabourerIds || [];
      const explicitAlloc = (e.allocations || []).find(a => a.labourerId === currentLabourerId);
      const share = explicitAlloc
        ? Number(explicitAlloc.allocatedAmount)
        : (Number(e.totalAmount) / (participants.length || 1));
      earned += share;
    });

    // 2. Payments
    let paid = 0;
    monthPayments.forEach(p => {
      workingDaysSet.add(p.date);
      paid += (Number(p.amount) || 0);
    });

    // 3. Service Expenses Breakdown
    let foodExpense = 0;
    let transportExpense = 0;
    let otherExpenses = 0;

    monthExpenses.forEach(exp => {
      const count = (exp.allocatedLabourerIds || []).length || 1;
      const share = exp.allocationType === 'individual'
        ? Number(exp.amount)
        : (exp.deductions?.find(d => d.labourerId === currentLabourerId)?.deductionAmount || (Number(exp.amount) / count));

      if (exp.category === 'food_meals') {
        foodExpense += share;
      } else if (exp.category === 'transportation') {
        transportExpense += share;
      } else {
        otherExpenses += share;
      }
    });

    const totalServiceExpense = Math.round((foodExpense + transportExpense + otherExpenses) * 100) / 100;
    const totalDeductions = Math.round((paid + totalServiceExpense) * 100) / 100;
    const remainingBalance = Math.round((earned - totalDeductions) * 100) / 100;

    return {
      workingDays: workingDaysSet.size,
      totalWeightKg: totalWeight > 0 ? totalWeight.toLocaleString('en-IN') : '0',
      totalEarned: Math.round(earned * 100) / 100,
      totalPaid: Math.round(paid * 100) / 100,
      foodExpense: Math.round(foodExpense * 100) / 100,
      transportExpense: Math.round(transportExpense * 100) / 100,
      totalServiceExpense,
      totalDeductions,
      remainingBalance,
      monthWork,
      monthPayments,
      monthExpenses,
    };
  }, [workEntries, payments, serviceExpenses, selectedMonth, currentLabourerId]);

  const handleShareWhatsApp = () => {
    setShowShareModal(true);
  };

  return (
    <View style={styles.container}>
      {/* 1. ORANGE HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>मजदूर का मासिक हिसाब</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. MONTH SELECTOR CARD */}
        <TouchableOpacity
          style={styles.selectorCard}
          onPress={() => setShowMonthPicker(true)}
          activeOpacity={0.85}
        >
          <Calendar size={18} color="#EE5A00" />
          <Text style={styles.selectorCardText}>{currentMonthLabel}</Text>
          <ChevronDown size={18} color="#64748B" />
        </TouchableOpacity>

        {/* 3. LABOURER PROFILE SELECTOR */}
        <TouchableOpacity
          style={styles.labourerSelectorCard}
          onPress={() => setShowLabourerPicker(true)}
          activeOpacity={0.85}
        >
          <View style={styles.labourerAvatarCircle}>
            <Text style={styles.labourerAvatarEmoji}>👨‍🌾</Text>
          </View>
          <View style={styles.labourerNameCol}>
            <Text style={styles.labourerNameText}>{labourer.name || 'गोलू'}</Text>
            <Text style={styles.labourerRoleText}>मजदूरर</Text>
          </View>
          <ChevronDown size={20} color="#64748B" />
        </TouchableOpacity>

        {/* 4. SUB-TABS */}
        <View style={styles.subTabsRow}>
          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'monthly_summary' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('monthly_summary')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.subTabText,
                activeSubTab === 'monthly_summary' && styles.subTabTextActive,
              ]}
            >
              मासिक सारांश
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'daily' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('daily')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.subTabText,
                activeSubTab === 'daily' && styles.subTabTextActive,
              ]}
            >
              दैनिक विवरण
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTabPill, activeSubTab === 'work' && styles.subTabPillActive]}
            onPress={() => setActiveSubTab('work')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.subTabText,
                activeSubTab === 'work' && styles.subTabTextActive,
              ]}
            >
              काम विवरण
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUB-TAB 1: MONTHLY SUMMARY CARD (Screen 3 Reference) */}
        {activeSubTab === 'monthly_summary' && (
          <View>
            {/* 5. TWO STAT BOXES */}
            <View style={styles.statsRow}>
              {/* Days */}
              <View style={styles.statBox}>
                <View style={styles.statIconBox}>
                  <Calendar size={18} color="#EE5A00" />
                </View>
                <View>
                  <Text style={styles.statLabel}>कुल कार्य दिवस</Text>
                  <Text style={styles.statValue}>{dynamicStatement.workingDays} दिन</Text>
                </View>
              </View>

              {/* Weight */}
              <View style={styles.statBox}>
                <View style={[styles.statIconBox, { backgroundColor: '#E8F5EC' }]}>
                  <Scale size={18} color="#137A38" />
                </View>
                <View>
                  <Text style={styles.statLabel}>कुल वजन</Text>
                  <Text style={styles.statValue}>{dynamicStatement.totalWeightKg} kg</Text>
                </View>
              </View>
            </View>

            {/* 6. WORK EARNED SUMMARY BANNER */}
            <View style={styles.earnedBanner}>
              <View style={styles.sigmaIconWrap}>
                <Sigma size={18} color="#137A38" />
              </View>
              <Text style={styles.earnedBannerLabel}>कुल मजदूरी (काम के अनुसार)</Text>
              <Text style={styles.earnedBannerValue}>
                ₹ {dynamicStatement.totalEarned.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* 7. PAYMENTS AND EXPENSES CARD */}
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownHeaderStrip}>
                <Wallet size={16} color="#EE5A00" />
                <Text style={styles.breakdownHeaderTitle}>भुगतान और खर्च</Text>
              </View>

              <View style={styles.breakdownBody}>
                {/* Row 1: कुल दिया गया भुगतान */}
                <View style={styles.breakdownLine}>
                  <View style={styles.breakdownLineLeft}>
                    <Text style={styles.lineBulletEmoji}>💸</Text>
                    <Text style={styles.lineLabel}>कुल दिया गया भुगतान</Text>
                  </View>
                  <Text style={styles.lineValue}>
                    ₹ {dynamicStatement.totalPaid.toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Row 2: खाना / भोजन खर्च */}
                <View style={styles.breakdownLine}>
                  <View style={styles.breakdownLineLeft}>
                    <Utensils size={15} color="#137A38" />
                    <Text style={styles.lineLabel}>खाना / भोजन खर्च</Text>
                  </View>
                  <Text style={styles.lineValue}>
                    ₹ {dynamicStatement.foodExpense.toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Row 3: आवागमन / अन्य सेवा */}
                <View style={styles.breakdownLine}>
                  <View style={styles.breakdownLineLeft}>
                    <Bus size={15} color="#137A38" />
                    <Text style={styles.lineLabel}>आवागमन / अन्य सेवा</Text>
                  </View>
                  <Text style={styles.lineValue}>
                    ₹ {dynamicStatement.transportExpense.toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Subtotal: कुल सेवा / अतिरिक्त खर्च */}
                <View style={styles.serviceSubtotalRow}>
                  <Text style={styles.serviceSubtotalLabel}>कुल सेवा / अतिरिक्त खर्च</Text>
                  <Text style={styles.serviceSubtotalValue}>
                    ₹ {dynamicStatement.totalServiceExpense.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>

            {/* 8. FINAL NET BALANCE RECONCILIATION CARD */}
            <View style={styles.balanceReconcileCard}>
              <View style={styles.balanceLine}>
                <View style={styles.balanceLineLeft}>
                  <Scale size={16} color="#137A38" />
                  <Text style={styles.balanceLineLabel}>कुल देय मजदूरी</Text>
                </View>
                <Text style={styles.balanceLineValue}>
                  ₹ {dynamicStatement.totalEarned.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.balanceLine}>
                <Text style={styles.balanceMinusLabel}>(-) कुल भुगतान + सेवा खर्च</Text>
                <Text style={styles.balanceLineValue}>
                  ₹ {dynamicStatement.totalDeductions.toLocaleString('en-IN')}
                </Text>
              </View>

              {/* Highlight Red/Green Balance Bar */}
              <View
                style={[
                  styles.redBalanceHighlightBar,
                  dynamicStatement.remainingBalance >= 0 && {
                    backgroundColor: '#E8F5EC',
                    borderColor: '#B7E4C7',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.redBalanceLabel,
                    dynamicStatement.remainingBalance >= 0 && { color: '#137A38' },
                  ]}
                >
                  बकाया / शेष राशि
                </Text>
                <Text
                  style={[
                    styles.redBalanceValue,
                    dynamicStatement.remainingBalance >= 0 && { color: '#137A38' },
                  ]}
                >
                  {dynamicStatement.remainingBalance < 0
                    ? `- ₹ ${Math.abs(dynamicStatement.remainingBalance).toLocaleString('en-IN')}`
                    : `₹ ${dynamicStatement.remainingBalance.toLocaleString('en-IN')}`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* SUB-TAB 2: DAILY CHRONOLOGICAL LOG */}
        {activeSubTab === 'daily' && (
          <View style={styles.tabContentContainer}>
            <Text style={styles.tabSectionTitle}>दैनिक कार्य व भुगतान लॉग</Text>
            {dynamicStatement.monthPayments.map((p) => (
              <View key={p.id} style={styles.dailyItemRow}>
                <View>
                  <Text style={styles.dailyItemDate}>{p.date}</Text>
                  <Text style={styles.dailyItemTitle}>भुगतान ({p.paymentMethod})</Text>
                </View>
                <Text style={[styles.dailyItemAmount, { color: '#2563EB' }]}>
                  - ₹ {p.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
            {dynamicStatement.monthExpenses.map((e) => (
              <View key={e.id} style={styles.dailyItemRow}>
                <View>
                  <Text style={styles.dailyItemDate}>{e.date}</Text>
                  <Text style={styles.dailyItemTitle}>सेवा कटौती ({e.expenseName})</Text>
                </View>
                <Text style={[styles.dailyItemAmount, { color: '#D92D20' }]}>
                  - ₹ {e.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* SUB-TAB 3: WORK DETAILS */}
        {activeSubTab === 'work' && (
          <View style={styles.tabContentContainer}>
            <Text style={styles.tabSectionTitle}>मासिक कार्य उत्पादन विवरण</Text>
            {dynamicStatement.monthWork.map((w) => (
              <View key={w.id} style={styles.dailyItemRow}>
                <View>
                  <Text style={styles.dailyItemDate}>{w.date}</Text>
                  <Text style={styles.dailyItemTitle}>{w.categoryName}</Text>
                  <Text style={styles.dailyItemSubtitle}>
                    {w.totalKg > 0 ? `${w.totalKg} kg (${w.totalBags} बोरी)` : `${w.totalBatches} बैच`}
                  </Text>
                </View>
                <Text style={[styles.dailyItemAmount, { color: '#137A38' }]}>
                  + ₹ {w.totalAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 9. BOTTOM ACTION BUTTONS */}
        <View style={styles.bottomActionsRow}>
          <TouchableOpacity
            style={styles.actionBtnWa}
            onPress={handleShareWhatsApp}
            activeOpacity={0.85}
          >
            <MessageCircle size={18} color="#137A38" />
            <Text style={styles.actionBtnWaText}>WhatsApp शेयर</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnPdf}
            onPress={() => setShowPdfModal(true)}
            activeOpacity={0.85}
          >
            <FileText size={18} color="#137A38" />
            <Text style={styles.actionBtnPdfText}>PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Month Selection Modal */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <View style={styles.pickerModalCard}>
            <Text style={styles.pickerModalTitle}>महीना चुनें</Text>
            {AVAILABLE_MONTHS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.pickerOption, selectedMonth === m.id && styles.pickerOptionActive]}
                onPress={() => {
                  setSelectedMonth(m.id);
                  setShowMonthPicker(false);
                }}
              >
                <Text style={[styles.pickerOptionText, selectedMonth === m.id && styles.pickerOptionTextActive]}>
                  {m.label}
                </Text>
                {selectedMonth === m.id && <Check size={18} color="#137A38" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Labourer Selection Modal */}
      <Modal
        visible={showLabourerPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLabourerPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLabourerPicker(false)}
        >
          <View style={styles.pickerModalCard}>
            <Text style={styles.pickerModalTitle}>मजदूर चुनें</Text>
            {labourers.map(l => (
              <TouchableOpacity
                key={l.id}
                style={[styles.pickerOption, currentLabourerId === l.id && styles.pickerOptionActive]}
                onPress={() => {
                  setCurrentLabourerId(l.id);
                  setShowLabourerPicker(false);
                }}
              >
                <Text style={[styles.pickerOptionText, currentLabourerId === l.id && styles.pickerOptionTextActive]}>
                  {l.name} ({l.role || 'मजदूर'})
                </Text>
                {currentLabourerId === l.id && <Check size={18} color="#137A38" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WhatsApp Share Review Modal */}
      <WhatsAppShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        statementData={{
          labourerId: labourer.id,
          labourerName: labourer.name,
          periodLabel: currentMonthLabel,
          workingDays: dynamicStatement.workingDays,
          totalLabourEarned: dynamicStatement.totalEarned,
          totalAmountPaid: dynamicStatement.totalPaid,
          totalAllocatedServiceExpenses: dynamicStatement.totalServiceExpense,
          remainingBalance: dynamicStatement.remainingBalance,
        }}
        contractorName={contractorName}
      />

      {/* PDF Statement Preview Modal */}
      <PdfPreviewModal
        visible={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        documentType="statement"
        data={{
          ...dynamicStatement,
          labourerName: labourer.name,
          labourerId: labourer.id,
          yearMonth: currentMonthLabel,
        }}
        contractorName={contractorName}
      />
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
  selectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginBottom: 10,
  },
  selectorCardText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    marginLeft: 10,
  },
  labourerSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginBottom: 12,
  },
  labourerAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  labourerAvatarEmoji: {
    fontSize: 20,
  },
  labourerNameCol: {
    flex: 1,
  },
  labourerNameText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  labourerRoleText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  subTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1EFEA',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  subTabPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  subTabPillActive: {
    backgroundColor: '#137A38', // Green Active Pill
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF2E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 1,
  },
  earnedBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginBottom: 12,
  },
  sigmaIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F5EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  earnedBannerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  earnedBannerValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    overflow: 'hidden',
    marginBottom: 12,
  },
  breakdownHeaderStrip: {
    backgroundColor: '#FFF7EC',
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5ECDF',
  },
  breakdownHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
  },
  breakdownBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  breakdownLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  breakdownLineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lineBulletEmoji: {
    fontSize: 14,
  },
  lineLabel: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  lineValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  serviceSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0ECE4',
  },
  serviceSubtotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  serviceSubtotalValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
  },
  balanceReconcileCard: {
    backgroundColor: '#F0F9F3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4EDDA',
    padding: 12,
    marginBottom: 16,
  },
  balanceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  balanceLineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLineLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#137A38',
  },
  balanceMinusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  balanceLineValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  redBalanceHighlightBar: {
    backgroundColor: '#FDECEC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FACCCC',
  },
  redBalanceLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#D92D20',
  },
  redBalanceValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#D92D20',
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtnWa: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#137A38',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnWaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#137A38',
  },
  actionBtnPdf: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#137A38',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnPdfText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#137A38',
  },
  tabContentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginBottom: 16,
  },
  tabSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 10,
  },
  dailyItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3EF',
  },
  dailyItemDate: {
    fontSize: 10.5,
    color: '#64748B',
  },
  dailyItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  dailyItemSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  dailyItemAmount: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pickerModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 14,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EFEA',
  },
  pickerOptionActive: {
    backgroundColor: '#F0F9F3',
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  pickerOptionTextActive: {
    color: '#137A38',
    fontWeight: '900',
  },
});
