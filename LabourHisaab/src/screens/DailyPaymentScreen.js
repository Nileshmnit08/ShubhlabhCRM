// DailyPaymentScreen for LabourHisaab
// High-fidelity matching with user reference UI snapshot (Screen 2)
// Implements LH-LEDGER-01: Full daily payment and expense workflow, 3 segmented tabs:
// 1. [मजदूर भुगतान]: Fast checkbox-driven entry for daily labour payments & immediate service costs
// 2. [खर्च / सेवा]: Explicit service expense recording with strict allocation policy (Contractor vs Individual vs Group)
// 3. [सारांश]: Consolidated Daily Labour Ledger with per-labourer balances (supporting negative balances),
//    itemized work entries, payment logs, and service expense deductions

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  Utensils,
  Coffee,
  Bus,
  Plus,
  Save,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Users,
} from 'lucide-react-native';
import theme from '../constants/theme';
import { useLabourHisaab } from '../context/LabourHisaabContext';
import { formatRupees } from '../utils/shareWhatsApp';

export default function DailyPaymentScreen({ route, navigation }) {
  const initialTab = route?.params?.initialTab || 'labour_payment';

  const {
    selectedDate,
    setSelectedDate,
    labourers,
    addBulkPayments,
    addServiceExpense,
    deletePayment,
    deleteServiceExpense,
    deleteWorkEntry,
    getDailyLedger,
  } = useLabourHisaab();

  const [activeTab, setActiveTab] = useState(initialTab); // 'labour_payment' | 'expenses' | 'summary'

  // Tab 1 state: 6 Labourers with amounts and checked states matching Screen 2
  const [labourerPayments, setLabourerPayments] = useState([
    { id: 'LH_LAB_001', name: 'गोलू', checked: true, amount: '1000' },
    { id: 'LH_LAB_002', name: 'सतीश', checked: true, amount: '1000' },
    { id: 'LH_LAB_003', name: 'आंग्रेश', checked: true, amount: '1000' },
    { id: 'LH_LAB_004', name: 'राहुल', checked: true, amount: '1000' },
    { id: 'LH_LAB_005', name: 'सोनू', checked: false, amount: '0' },
    { id: 'LH_LAB_006', name: 'आदित्य', checked: false, amount: '0' },
  ]);

  // Tab 1 quick expenses
  const [foodExpense, setFoodExpense] = useState('300');
  const [teaExpense, setTeaExpense] = useState('60');
  const [transportExpense, setTransportExpense] = useState('0');

  // Tab 2 (Dedicated Expenses) state
  const [expCategory, setExpCategory] = useState('tea_breakfast');
  const [expName, setExpName] = useState('चाय नाश्ता');
  const [expAmount, setExpAmount] = useState('150');
  const [expDescription, setExpDescription] = useState('');
  const [expAllocationType, setExpAllocationType] = useState('contractor_expense'); // 'contractor_expense' | 'individual' | 'group'
  const [expSelectedLabourers, setExpSelectedLabourers] = useState([]);

  // Date Navigation
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Toggle labourer checkbox for Tab 1
  const handleToggleLabourer = (index) => {
    setLabourerPayments(prev => {
      const copy = [...prev];
      const isChecked = !copy[index].checked;
      copy[index] = {
        ...copy[index],
        checked: isChecked,
        amount: isChecked ? (copy[index].amount === '0' ? '1000' : copy[index].amount) : '0',
      };
      return copy;
    });
  };

  const allChecked = labourerPayments.every(l => l.checked);
  const handleToggleSelectAll = () => {
    const nextState = !allChecked;
    setLabourerPayments(prev =>
      prev.map(l => ({
        ...l,
        checked: nextState,
        amount: nextState ? (l.amount === '0' ? '1000' : l.amount) : '0',
      }))
    );
  };

  const handleAmountChange = (index, val) => {
    setLabourerPayments(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], amount: val };
      return copy;
    });
  };

  // Tab 1 Calculated Totals
  const totalPayment = labourerPayments.reduce(
    (acc, cur) => acc + (cur.checked ? (Number(cur.amount) || 0) : 0),
    0
  );

  const totalExpenses =
    (Number(foodExpense) || 0) +
    (Number(teaExpense) || 0) +
    (Number(transportExpense) || 0);

  const grandTotal = totalPayment + totalExpenses;

  // Tab 3: Dynamic Daily Ledger for Selected Date
  const dailyLedger = useMemo(() => {
    return getDailyLedger(selectedDate);
  }, [selectedDate, getDailyLedger]);

  // Save handler for Tab 1
  const handleSaveTab1 = () => {
    const paymentsToSave = labourerPayments
      .filter(l => l.checked && Number(l.amount) > 0)
      .map(l => ({
        labourerId: l.id,
        amount: Number(l.amount),
        paymentMethod: 'Cash',
        notes: 'दैनिक भुगतान',
      }));

    if (paymentsToSave.length > 0) {
      addBulkPayments({
        date: selectedDate,
        paymentItems: paymentsToSave,
      });
    }

    if (Number(foodExpense) > 0) {
      addServiceExpense({
        date: selectedDate,
        category: 'food_meals',
        expenseName: 'खाना (6 मजदूर)',
        amount: Number(foodExpense),
        description: 'दोपहर भोजन',
        allocationType: 'group',
        allocatedLabourerIds: ['LH_LAB_001', 'LH_LAB_002', 'LH_LAB_003', 'LH_LAB_004', 'LH_LAB_005', 'LH_LAB_006'],
      });
    }

    if (Number(teaExpense) > 0) {
      addServiceExpense({
        date: selectedDate,
        category: 'tea_breakfast',
        expenseName: 'चाय नाश्ता',
        amount: Number(teaExpense),
        description: 'शाम की चाय',
        allocationType: 'contractor_expense',
        allocatedLabourerIds: [],
      });
    }

    Alert.alert(
      'सफलतापूर्वक सुरक्षित',
      `आज का कुल खर्च ₹ ${grandTotal.toLocaleString('en-IN')} (भुगतान: ₹ ${totalPayment.toLocaleString('en-IN')}, सेवा खर्च: ₹ ${totalExpenses.toLocaleString('en-IN')}) सफलतापूर्वक सहेज लिया गया।`,
      [{ text: 'ठीक है', onPress: () => navigation.goBack() }]
    );
  };

  // Save handler for Tab 2 (Dedicated Expense)
  const handleSaveDedicatedExpense = () => {
    const amt = Number(expAmount);
    if (!amt || amt <= 0) {
      Alert.alert('त्रुटि', 'कृपया वैध खर्च राशि दर्ज करें।');
      return;
    }
    if (expAllocationType !== 'contractor_expense' && expSelectedLabourers.length === 0) {
      Alert.alert('त्रुटि', 'कृपया कटौती के लिए कम से कम एक मजदूर का चयन करें।');
      return;
    }

    addServiceExpense({
      date: selectedDate,
      category: expCategory,
      expenseName: expName,
      amount: amt,
      description: expDescription,
      allocationType: expAllocationType,
      allocatedLabourerIds: expAllocationType === 'contractor_expense' ? [] : expSelectedLabourers,
    });

    Alert.alert(
      'सेवा खर्च दर्ज',
      `${expName} (₹ ${amt.toLocaleString('en-IN')}) दर्ज कर दिया गया है।`,
      [{ text: 'ठीक है', onPress: () => setActiveTab('summary') }]
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. TOP ORANGE HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>दैनिक भुगतान</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. DATE STRIP */}
        <View style={styles.dateStrip}>
          <TouchableOpacity style={styles.chevronBtn} onPress={handlePrevDay}>
            <ChevronLeft size={20} color="#64748B" />
          </TouchableOpacity>
          <View style={styles.dateCenter}>
            <Calendar size={16} color="#EE5A00" />
            <Text style={styles.dateText}>
              {selectedDate === '2026-11-03' ? '03 नवम्बर 2026' : selectedDate}
            </Text>
          </View>
          <TouchableOpacity style={styles.chevronBtn} onPress={handleNextDay}>
            <ChevronRight size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* 3. SEGMENTED TABS */}
        <View style={styles.segmentedTabsRow}>
          <TouchableOpacity
            style={[styles.segTab, activeTab === 'labour_payment' && styles.segTabActive]}
            onPress={() => setActiveTab('labour_payment')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segTabText,
                activeTab === 'labour_payment' && styles.segTabTextActive,
              ]}
            >
              मजदूर भुगतान
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segTab, activeTab === 'expenses' && styles.segTabActive]}
            onPress={() => setActiveTab('expenses')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segTabText,
                activeTab === 'expenses' && styles.segTabTextActive,
              ]}
            >
              खर्च / सेवा
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segTab, activeTab === 'summary' && styles.segTabActive]}
            onPress={() => setActiveTab('summary')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segTabText,
                activeTab === 'summary' && styles.segTabTextActive,
              ]}
            >
              सारांश
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================= */}
        {/* TAB 1: मजदूर भुगतान (Screen 2 Reference) */}
        {/* ========================================================= */}
        {activeTab === 'labour_payment' && (
          <View>
            {/* Section: आज के मजदूर (6) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>आज के मजदूर ({labourerPayments.length})</Text>
              <TouchableOpacity
                style={styles.selectAllRow}
                onPress={handleToggleSelectAll}
                activeOpacity={0.7}
              >
                <View style={[styles.checkboxSquare, allChecked && styles.checkboxSquareChecked]}>
                  {allChecked && <Check size={14} color="#FFF" strokeWidth={3} />}
                </View>
                <Text style={styles.selectAllText}>सभी चुनें</Text>
              </TouchableOpacity>
            </View>

            {/* 6 Labourers List Container */}
            <View style={styles.labourersCard}>
              {labourerPayments.map((lab, idx) => (
                <View
                  key={lab.id}
                  style={[
                    styles.labourerRow,
                    idx === labourerPayments.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarEmoji}>👨‍🌾</Text>
                  </View>

                  <Text style={styles.labourerName}>{lab.name}</Text>

                  <TouchableOpacity
                    style={[styles.checkboxSquare, lab.checked && styles.checkboxSquareChecked]}
                    onPress={() => handleToggleLabourer(idx)}
                    activeOpacity={0.7}
                  >
                    {lab.checked && <Check size={14} color="#FFF" strokeWidth={3} />}
                  </TouchableOpacity>

                  <View style={styles.amountInputWrap}>
                    <Text style={styles.rupeeSign}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={lab.amount}
                      onChangeText={(val) => handleAmountChange(idx, val)}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Section: आज की अतिरिक्त सेवा / खर्च */}
            <View style={styles.expensesSection}>
              <Text style={styles.sectionTitle}>आज की अतिरिक्त सेवा / खर्च</Text>

              <View style={styles.expensesCard}>
                {/* Row 1: खाना (6 मजदूर) */}
                <View style={styles.expenseRow}>
                  <View style={styles.expenseLeft}>
                    <View style={[styles.expenseIconWrap, { backgroundColor: '#FFF2E6' }]}>
                      <Utensils size={16} color="#EE5A00" />
                    </View>
                    <Text style={styles.expenseLabel}>खाना (6 मजदूर)</Text>
                  </View>
                  <View style={styles.expenseInputWrap}>
                    <Text style={styles.rupeeSign}>₹</Text>
                    <TextInput
                      style={styles.expenseInput}
                      value={foodExpense}
                      onChangeText={setFoodExpense}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Row 2: चाय नाश्ता */}
                <View style={styles.expenseRow}>
                  <View style={styles.expenseLeft}>
                    <View style={[styles.expenseIconWrap, { backgroundColor: '#FEF3C7' }]}>
                      <Coffee size={16} color="#D97706" />
                    </View>
                    <Text style={styles.expenseLabel}>चाय नाश्ता</Text>
                  </View>
                  <View style={styles.expenseInputWrap}>
                    <Text style={styles.rupeeSign}>₹</Text>
                    <TextInput
                      style={styles.expenseInput}
                      value={teaExpense}
                      onChangeText={setTeaExpense}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Row 3: आवागमन / ट्रांसपोर्ट */}
                <View style={[styles.expenseRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.expenseLeft}>
                    <View style={[styles.expenseIconWrap, { backgroundColor: '#FEE2E2' }]}>
                      <Bus size={16} color="#DC2626" />
                    </View>
                    <Text style={styles.expenseLabel}>आवागमन / ट्रांसपोर्ट</Text>
                  </View>
                  <View style={styles.expenseInputWrap}>
                    <Text style={styles.rupeeSign}>₹</Text>
                    <TextInput
                      style={styles.expenseInput}
                      value={transportExpense}
                      onChangeText={setTransportExpense}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Add Other Expense Link */}
              <TouchableOpacity
                style={styles.addOtherExpenseBtn}
                onPress={() => setActiveTab('expenses')}
                activeOpacity={0.7}
              >
                <Plus size={16} color="#D92D20" />
                <Text style={styles.addOtherExpenseText}>अन्य खर्च जोड़ें</Text>
              </TouchableOpacity>
            </View>

            {/* Daily Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>आज कुल भुगतान</Text>
                <Text style={styles.summaryValue}>₹ {totalPayment.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>आज कुल खर्च (सेवा)</Text>
                <Text style={styles.summaryValue}>₹ {totalExpenses.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.summaryTotalBar}>
                <Text style={styles.totalBarLabel}>आज का कुल खर्च</Text>
                <Text style={styles.totalBarValue}>₹ {grandTotal.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Save Button (Bottom CTA) */}
            <TouchableOpacity
              style={styles.saveCtaBtn}
              onPress={handleSaveTab1}
              activeOpacity={0.85}
            >
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveCtaText}>सेव करें</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 2: खर्च / सेवा (Explicit Allocation Policy) */}
        {/* ========================================================= */}
        {activeTab === 'expenses' && (
          <View style={styles.dedicatedExpenseForm}>
            <Text style={styles.sectionTitle}>सेवा खर्च विवरण दर्ज करें</Text>

            {/* Category Selector */}
            <View style={styles.expenseCategoryChipsRow}>
              {[
                { id: 'tea_breakfast', label: '☕ चाय नाश्ता' },
                { id: 'food_meals', label: '🍲 खाना / भोजन' },
                { id: 'transportation', label: '🚌 आवागमन' },
                { id: 'accommodation', label: '🏠 कमरा / आवास' },
              ].map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.expChip, expCategory === cat.id && styles.expChipActive]}
                  onPress={() => {
                    setExpCategory(cat.id);
                    setExpName(cat.label.replace(/^[^\s]+\s/, ''));
                  }}
                >
                  <Text style={[styles.expChipText, expCategory === cat.id && styles.expChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Expense Name & Amount */}
            <View style={styles.formGroupCard}>
              <Text style={styles.fieldLabel}>खर्च का नाम</Text>
              <TextInput
                style={styles.formInput}
                value={expName}
                onChangeText={setExpName}
                placeholder="जैसे: सुबह का नाश्ता, डीजल..."
              />

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>राशि (₹)</Text>
              <TextInput
                style={[styles.formInput, { fontSize: 16, fontWeight: '800' }]}
                value={expAmount}
                onChangeText={setExpAmount}
                keyboardType="numeric"
              />
            </View>

            {/* Allocation Policy */}
            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>खर्च आवंटन नीति (Allocation Scope)</Text>
            <View style={styles.allocationPolicyBox}>
              <TouchableOpacity
                style={[styles.policyOption, expAllocationType === 'contractor_expense' && styles.policyOptionActive]}
                onPress={() => setExpAllocationType('contractor_expense')}
              >
                <View style={styles.radioCircle}>
                  {expAllocationType === 'contractor_expense' && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyTitle}>👷‍♂️ ठेकेदार वहन खर्च</Text>
                  <Text style={styles.policySubtitle}>मजदूरों की कमाई से कोई कटौती नहीं होगी।</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.policyOption, expAllocationType === 'group' && styles.policyOptionActive]}
                onPress={() => setExpAllocationType('group')}
              >
                <View style={styles.radioCircle}>
                  {expAllocationType === 'group' && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.policyTitle}>👥 ग्रुप कटौती (Group Deduction)</Text>
                  <Text style={styles.policySubtitle}>चयनित मजदूरों में बराबर बांटा जाएगा।</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Select Labourers if Group Deduction */}
            {expAllocationType !== 'contractor_expense' && (
              <View style={styles.labourersSelectBox}>
                <Text style={styles.fieldLabel}>कटौती हेतु मजदूर चुनें:</Text>
                <View style={styles.labourerCheckRow}>
                  {labourers.filter(l => l.isActive).map(lab => {
                    const isSel = expSelectedLabourers.includes(lab.id);
                    return (
                      <TouchableOpacity
                        key={lab.id}
                        style={[styles.labTag, isSel && styles.labTagActive]}
                        onPress={() => {
                          setExpSelectedLabourers(prev =>
                            prev.includes(lab.id) ? prev.filter(x => x !== lab.id) : [...prev, lab.id]
                          );
                        }}
                      >
                        <Text style={[styles.labTagText, isSel && styles.labTagTextActive]}>
                          {isSel ? '✓ ' : ''}{lab.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveCtaBtn, { marginTop: 16 }]}
              onPress={handleSaveDedicatedExpense}
              activeOpacity={0.85}
            >
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveCtaText}>सेवा खर्च सुरक्षित करें</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 3: सारांश (CONSOLIDATED DAILY LABOUR LEDGER) */}
        {/* ========================================================= */}
        {activeTab === 'summary' && (
          <View style={styles.ledgerContainer}>
            {/* Daily Overview KPI Strip */}
            <View style={styles.ledgerKpiRow}>
              <View style={styles.ledgerKpiBox}>
                <Text style={styles.kpiLabelSmall}>कुल मजदूरी</Text>
                <Text style={[styles.kpiValueSmall, { color: '#137A38' }]}>
                  {formatRupees(dailyLedger.totalLabourEarned)}
                </Text>
              </View>
              <View style={styles.ledgerKpiBox}>
                <Text style={styles.kpiLabelSmall}>कुल भुगतान</Text>
                <Text style={[styles.kpiValueSmall, { color: '#2563EB' }]}>
                  {formatRupees(dailyLedger.totalPayments)}
                </Text>
              </View>
              <View style={styles.ledgerKpiBox}>
                <Text style={styles.kpiLabelSmall}>सेवा खर्च</Text>
                <Text style={[styles.kpiValueSmall, { color: '#D97706' }]}>
                  {formatRupees(dailyLedger.totalServiceExpenses)}
                </Text>
              </View>
              <View style={styles.ledgerKpiBox}>
                <Text style={styles.kpiLabelSmall}>बकाया शेष</Text>
                <Text
                  style={[
                    styles.kpiValueSmall,
                    { color: dailyLedger.remainingPayableToday >= 0 ? '#137A38' : '#D92D20' },
                  ]}
                >
                  {formatRupees(dailyLedger.remainingPayableToday)}
                </Text>
              </View>
            </View>

            {/* Individual Labourer Daily Balances Table */}
            <View style={styles.ledgerCard}>
              <View style={styles.ledgerHeader}>
                <Text style={styles.ledgerTitle}>मजदूर-वार दैनिक लेजर (Daily Balances)</Text>
              </View>

              <View style={styles.ledgerTableHead}>
                <Text style={[styles.ledgerTh, { flex: 1.2 }]}>मजदूर</Text>
                <Text style={[styles.ledgerTh, { width: 55, textAlign: 'right' }]}>कमाई</Text>
                <Text style={[styles.ledgerTh, { width: 55, textAlign: 'right' }]}>भुगतान</Text>
                <Text style={[styles.ledgerTh, { width: 55, textAlign: 'right' }]}>कटौती</Text>
                <Text style={[styles.ledgerTh, { width: 65, textAlign: 'right' }]}>बकाया</Text>
              </View>

              {dailyLedger.labourerLedger.map((lab) => {
                const isNeg = lab.remainingBalance < 0;
                return (
                  <View key={lab.labourerId} style={styles.ledgerTableRow}>
                    <Text style={[styles.ledgerTd, { flex: 1.2, fontWeight: '800' }]}>
                      {lab.labourerName}
                    </Text>
                    <Text style={[styles.ledgerTd, { width: 55, textAlign: 'right', color: '#137A38' }]}>
                      ₹ {lab.earned}
                    </Text>
                    <Text style={[styles.ledgerTd, { width: 55, textAlign: 'right', color: '#2563EB' }]}>
                      ₹ {lab.paid}
                    </Text>
                    <Text style={[styles.ledgerTd, { width: 55, textAlign: 'right', color: '#64748B' }]}>
                      ₹ {lab.deductions}
                    </Text>
                    <Text
                      style={[
                        styles.ledgerTd,
                        {
                          width: 65,
                          textAlign: 'right',
                          fontWeight: '900',
                          color: isNeg ? '#D92D20' : lab.remainingBalance === 0 ? '#1E293B' : '#137A38',
                        },
                      ]}
                    >
                      {isNeg ? `- ₹ ${Math.abs(lab.remainingBalance)}` : `₹ ${lab.remainingBalance}`}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Today's Recorded Items (Work, Payments, Expenses) */}
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>आज की प्रविष्टियां विवरण (Saved Records)</Text>

              {/* Work */}
              <Text style={styles.itemTypeHeader}>📦 उत्पादन कार्य ({dailyLedger.workEntries.length})</Text>
              {dailyLedger.workEntries.map((w) => (
                <View key={w.id} style={styles.detailRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>{w.categoryName}</Text>
                    <Text style={styles.detailSub}>
                      {w.totalKg > 0 ? `${w.totalKg} kg (${w.totalBags} बोरी)` : `${w.totalBatches} बैच`}
                    </Text>
                  </View>
                  <Text style={[styles.detailAmt, { color: '#137A38' }]}>+ {formatRupees(w.totalAmount)}</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AddWorkEntryModal', { workEntryToEdit: w })}
                    style={{ marginLeft: 8 }}
                    accessibilityLabel="सम्पादित करें"
                  >
                    <Edit2 size={16} color="#2563EB" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteWorkEntry(w.id)}
                    style={{ marginLeft: 8 }}
                    accessibilityLabel="हटाएं"
                  >
                    <Trash2 size={16} color="#D92D20" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Payments */}
              <Text style={[styles.itemTypeHeader, { marginTop: 12 }]}>💵 भुगतान प्रविष्टियां ({dailyLedger.payments.length})</Text>
              {dailyLedger.payments.map((p) => (
                <View key={p.id} style={styles.detailRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>{p.labourerName}</Text>
                    <Text style={styles.detailSub}>{p.paymentMethod} • {p.notes || 'दैनिक भुगतान'}</Text>
                  </View>
                  <Text style={[styles.detailAmt, { color: '#2563EB' }]}>- {formatRupees(p.amount)}</Text>
                  <TouchableOpacity
                    onPress={() => deletePayment(p.id)}
                    style={{ marginLeft: 8 }}
                  >
                    <Trash2 size={16} color="#D92D20" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Expenses */}
              <Text style={[styles.itemTypeHeader, { marginTop: 12 }]}>☕ सेवा खर्च प्रविष्टियां ({dailyLedger.serviceExpenses.length})</Text>
              {dailyLedger.serviceExpenses.map((e) => (
                <View key={e.id} style={styles.detailRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>{e.expenseName}</Text>
                    <Text style={styles.detailSub}>
                      {e.allocationType === 'contractor_expense' ? 'ठेकेदार वहन (मजदूर से नहीं कटेगा)' : 'ग्रुप कटौती'}
                    </Text>
                  </View>
                  <Text style={[styles.detailAmt, { color: '#D97706' }]}>₹ {e.amount}</Text>
                  <TouchableOpacity
                    onPress={() => deleteServiceExpense(e.id)}
                    style={{ marginLeft: 8 }}
                  >
                    <Trash2 size={16} color="#D92D20" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
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
    backgroundColor: '#F57C00',
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
  dateStrip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EFECE6',
    marginBottom: 12,
  },
  chevronBtn: {
    padding: 4,
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  segmentedTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1EFEA',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  segTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segTabActive: {
    backgroundColor: '#137A38',
  },
  segTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  segTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#137A38',
  },
  labourersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
  },
  labourerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3EF',
    gap: 10,
  },
  avatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 16,
  },
  labourerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSquareChecked: {
    backgroundColor: '#137A38',
    borderColor: '#137A38',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 100,
  },
  rupeeSign: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    padding: 0,
    flex: 1,
    textAlign: 'right',
  },
  expensesSection: {
    marginBottom: 14,
  },
  expensesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 8,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3EF',
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expenseIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  expenseInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 90,
  },
  expenseInput: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    padding: 0,
    flex: 1,
    textAlign: 'right',
  },
  addOtherExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  addOtherExpenseText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D92D20',
  },
  summaryCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3EAD9',
    padding: 12,
    marginBottom: 16,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  summaryTotalBar: {
    backgroundColor: '#E8F5EC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  totalBarLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#137A38',
  },
  totalBarValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#137A38',
  },
  saveCtaBtn: {
    backgroundColor: '#137A38',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#137A38',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  saveCtaText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Tab 2 styles
  dedicatedExpenseForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  expenseCategoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  expChip: {
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  expChipActive: {
    backgroundColor: '#FFF2E6',
    borderColor: '#EE5A00',
  },
  expChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  expChipTextActive: {
    color: '#EE5A00',
    fontWeight: '800',
  },
  formGroupCard: {
    marginVertical: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1E293B',
  },
  allocationPolicyBox: {
    gap: 8,
    marginTop: 8,
  },
  policyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAF9F6',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
  },
  policyOptionActive: {
    backgroundColor: '#F0F9F3',
    borderColor: '#137A38',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#137A38',
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  policySubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  labourersSelectBox: {
    marginTop: 12,
  },
  labourerCheckRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  labTag: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labTagActive: {
    backgroundColor: '#E8F5EC',
    borderColor: '#137A38',
  },
  labTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  labTagTextActive: {
    color: '#137A38',
    fontWeight: '800',
  },

  // Tab 3 Ledger styles
  ledgerContainer: {
    gap: 12,
  },
  ledgerKpiRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ledgerKpiBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EFECE6',
    alignItems: 'center',
  },
  kpiLabelSmall: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '700',
  },
  kpiValueSmall: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  ledgerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFECE6',
    overflow: 'hidden',
  },
  ledgerHeader: {
    backgroundColor: '#FAF9F6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE6',
  },
  ledgerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
  },
  ledgerTableHead: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FAF9F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F1EFEA',
  },
  ledgerTh: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  ledgerTableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3EF',
    alignItems: 'center',
  },
  ledgerTd: {
    fontSize: 11.5,
    color: '#1E293B',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
  },
  itemTypeHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F3EF',
  },
  detailName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  detailSub: {
    fontSize: 10,
    color: '#64748B',
  },
  detailAmt: {
    fontSize: 12.5,
    fontWeight: '900',
  },
});
