// LabourDetailScreen for LabourHisaab
// Individual labour history, monthly statement, calculation card, and WhatsApp sharing

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import {
  ChevronLeft,
  Phone,
  MessageCircle,
  Wallet,
  Calendar,
  Clock,
  TrendingUp,
  Coffee,
  AlertCircle,
  ShieldCheck,
  FileText,
  ArrowUpRight,
} from 'lucide-react-native';
import theme from '../constants/theme';
import WhatsAppShareModal from '../components/WhatsAppShareModal';
import { useLabourHisaab } from '../context/LabourHisaabContext';
import { formatRupees } from '../utils/shareWhatsApp';

export default function LabourDetailScreen({ route, navigation }) {
  const { labourerId } = route.params;
  const {
    labourers,
    workEntries,
    payments,
    serviceExpenses,
    selectedMonth,
    setSelectedMonth,
    getLabourerStatement,
    contractorName,
  } = useLabourHisaab();

  const [historyTab, setHistoryTab] = useState('all'); // 'all' | 'work' | 'payment' | 'expense'
  const [showShareModal, setShowShareModal] = useState(false);

  // Labourer profile
  const labourer = useMemo(() => {
    return labourers.find(l => l.id === labourerId) || {
      id: labourerId,
      name: 'Unknown',
      isActive: false,
    };
  }, [labourers, labourerId]);

  // Monthly Statement
  const statement = useMemo(() => {
    return getLabourerStatement(labourerId, selectedMonth);
  }, [labourerId, selectedMonth, getLabourerStatement]);

  // Combined chronological history for this labourer
  const combinedHistory = useMemo(() => {
    const list = [];

    // 1. Work Entries
    workEntries.forEach(entry => {
      const isParticipant =
        !entry.participatingLabourerIds ||
        entry.participatingLabourerIds.length === 0 ||
        entry.participatingLabourerIds.includes(labourerId);

      if (isParticipant) {
        const shareCount = entry.participatingLabourerIds?.length || 1;
        const labourerShare = (entry.totalAmount || 0) / shareCount;
        list.push({
          id: `w_${entry.id}`,
          type: 'work',
          date: entry.date,
          title: entry.categoryName,
          subtitle: `${entry.totalBags || 0} बोरी ${entry.totalKg ? `(${entry.totalKg} kg)` : ''}`,
          amount: labourerShare,
          badge: 'मजदूरी कमाई',
          badgeColor: theme.colors.success,
          isCredit: true,
          notes: entry.notes,
        });
      }
    });

    // 2. Payments
    payments
      .filter(p => p.labourerId === labourerId)
      .forEach(p => {
        list.push({
          id: `p_${p.id}`,
          type: 'payment',
          date: p.date,
          title: `भुगतान (${p.paymentMethod === 'Cash' ? 'नकद' : 'अन्य / बैंक'})`,
          subtitle: p.notes || 'दैनिक भुगतान',
          amount: p.amount,
          badge: 'भुगतान दिया',
          badgeColor: '#2563EB',
          isCredit: false,
        });
      });

    // 3. Allocated Expense Deductions
    serviceExpenses.forEach(exp => {
      if (exp.allocationType === 'contractor_expense') return; // Not deducted!

      const isAllocated = (exp.allocatedLabourerIds || []).includes(labourerId);
      if (isAllocated) {
        const shareAmount =
          exp.allocationType === 'individual'
            ? exp.amount
            : (exp.amount / (exp.allocatedLabourerIds.length || 1));

        list.push({
          id: `e_${exp.id}`,
          type: 'expense',
          date: exp.date,
          title: `कटौती: ${exp.expenseName}`,
          subtitle: exp.description || 'सेवा खर्च कटौती',
          amount: shareAmount,
          badge: 'सेवा कटौती',
          badgeColor: theme.colors.danger,
          isCredit: false,
        });
      }
    });

    // Sort by date descending
    list.sort((a, b) => (b.date > a.date ? 1 : -1));

    // Filter by tab
    if (historyTab === 'work') return list.filter(i => i.type === 'work');
    if (historyTab === 'payment') return list.filter(i => i.type === 'payment');
    if (historyTab === 'expense') return list.filter(i => i.type === 'expense');
    return list;
  }, [workEntries, payments, serviceExpenses, labourerId, historyTab]);

  // Call handler
  const handleCall = () => {
    if (labourer.phone) {
      Linking.openURL(`tel:${labourer.phone}`);
    } else {
      Alert.alert('सूचना', 'मजदूर का मोबाइल नंबर दर्ज नहीं है।');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="पीछे जाएं"
        >
          <ChevronLeft size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{labourer.name}</Text>
          <Text style={styles.headerIdCode}>स्थिर कोड: {labourer.id}</Text>
        </View>
        <TouchableOpacity
          style={styles.waHeaderBtn}
          onPress={() => setShowShareModal(true)}
        >
          <MessageCircle size={20} color="#25D366" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card & Quick Actions */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View
              style={[
                styles.profileAvatar,
                { backgroundColor: labourer.isActive ? labourer.avatarColor || '#F28C28' : '#94A3B8' },
              ]}
            >
              <Text style={styles.profileInitials}>{labourer.name.slice(0, 2)}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.profileNameText}>{labourer.name}</Text>
                <View
                  style={[
                    styles.statusPill,
                    labourer.isActive ? styles.statusPillActive : styles.statusPillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      labourer.isActive ? styles.statusTextActive : styles.statusTextInactive,
                    ]}
                  >
                    {labourer.isActive ? 'सक्रिय' : 'निष्क्रिय'}
                  </Text>
                </View>
              </View>
              <Text style={styles.profileRoleText}>{labourer.role || 'सामान्य मजदूर'}</Text>
              <Text style={styles.profileJoinDate}>शामिल होने की तिथि: {labourer.joinDate}</Text>
            </View>
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.actionButtonsRow}>
            {labourer.phone && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleCall}
                activeOpacity={0.8}
              >
                <Phone size={16} color={theme.colors.textPrimary} />
                <Text style={styles.actionBtnText}>कॉल करें</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.waActionButton]}
              onPress={() => setShowShareModal(true)}
              activeOpacity={0.8}
            >
              <MessageCircle size={16} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>व्हाट्सएप पर्ची</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.payActionButton]}
              onPress={() =>
                navigation.navigate('DailyPaymentModal', {
                  initialTab: 'payment',
                  labourerId: labourer.id,
                })
              }
              activeOpacity={0.8}
            >
              <Wallet size={16} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>भुगतान दें</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Month Selector Strip */}
        <View style={styles.monthSelectorRow}>
          <Text style={styles.monthSectionTitle}>मासिक हिसाब विवरण</Text>
          <View style={styles.monthChips}>
            {['2026-11', '2026-10'].map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.monthChip, selectedMonth === m && styles.monthChipActive]}
                onPress={() => setSelectedMonth(m)}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    selectedMonth === m && styles.monthChipTextActive,
                  ]}
                >
                  {m === '2026-11' ? 'नवम्बर 2026' : 'अक्टूबर 2026'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Individual Monthly Statement Card */}
        <View style={styles.statementCard}>
          <View style={styles.statementHeader}>
            <View>
              <Text style={styles.statementTitle}>मासिक हिसाब पत्रक (Statement)</Text>
              <Text style={styles.statementSubtitle}>
                कार्य दिवस: {statement.workingDays} दिन
              </Text>
            </View>
            <TouchableOpacity
              style={styles.fullStatementLink}
              onPress={() =>
                navigation.navigate('IndividualStatementModal', { labourerId: labourer.id })
              }
            >
              <FileText size={14} color={theme.colors.primaryDark} />
              <Text style={styles.fullStatementLinkText}>पूरी पर्ची</Text>
            </TouchableOpacity>
          </View>

          {/* Consistent Calculation Breakdown */}
          <View style={styles.calcBreakdownCard}>
            <View style={styles.calcRow}>
              <View style={styles.calcRowLeft}>
                <TrendingUp size={16} color={theme.colors.success} />
                <Text style={styles.calcRowTitle}>कुल मजदूरी कमाई (+):</Text>
              </View>
              <Text style={[styles.calcRowAmount, { color: theme.colors.success }]}>
                {formatRupees(statement.totalLabourEarned)}
              </Text>
            </View>

            <View style={styles.calcRow}>
              <View style={styles.calcRowLeft}>
                <Wallet size={16} color="#2563EB" />
                <Text style={styles.calcRowTitle}>दिया गया भुगतान (-):</Text>
              </View>
              <Text style={[styles.calcRowAmount, { color: '#2563EB' }]}>
                {formatRupees(statement.totalAmountPaid)}
              </Text>
            </View>

            <View style={styles.calcRow}>
              <View style={styles.calcRowLeft}>
                <Coffee size={16} color={theme.colors.danger} />
                <Text style={styles.calcRowTitle}>सेवा खर्च कटौती (-):</Text>
              </View>
              <Text style={[styles.calcRowAmount, { color: theme.colors.danger }]}>
                {formatRupees(statement.totalAllocatedServiceExpenses)}
              </Text>
            </View>

            <View style={styles.calcDivider} />

            <View style={styles.remainingRow}>
              <View>
                <Text style={styles.remainingLabel}>देय बकाया राशि (Payable):</Text>
                <Text style={styles.remainingFormulaNote}>
                  (कुल कमाई - कुल भुगतान - सेवा कटौती)
                </Text>
              </View>
              <Text
                style={[
                  styles.remainingAmount,
                  statement.remainingBalance > 0
                    ? { color: theme.colors.danger }
                    : { color: theme.colors.success },
                ]}
              >
                {formatRupees(statement.remainingBalance)}
              </Text>
            </View>
          </View>

          {/* Contractor Expense Distinction Notice */}
          {statement.contractorBorneExpenses > 0 && (
            <View style={styles.contractorExpenseNotice}>
              <ShieldCheck size={16} color={theme.colors.success} />
              <Text style={styles.contractorExpenseNoticeText}>
                ठेकेदार द्वारा वहन खर्च: {formatRupees(statement.contractorBorneExpenses)} (मजदूर से नहीं काटा गया)
              </Text>
            </View>
          )}
        </View>

        {/* Detailed History Timeline Section */}
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>मजदूर का कार्य व भुगतान इतिहास</Text>

          {/* History filter tabs */}
          <View style={styles.historyTabsRow}>
            {[
              { id: 'all', label: 'सभी' },
              { id: 'work', label: 'कार्य' },
              { id: 'payment', label: 'भुगतान' },
              { id: 'expense', label: 'कटौती' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.historyTabPill,
                  historyTab === tab.id && styles.historyTabPillActive,
                ]}
                onPress={() => setHistoryTab(tab.id)}
              >
                <Text
                  style={[
                    styles.historyTabPillText,
                    historyTab === tab.id && styles.historyTabPillTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* History list */}
          <View style={styles.historyList}>
            {combinedHistory.length === 0 ? (
              <Text style={styles.noHistoryText}>इस श्रेणी में कोई रिकॉर्ड नहीं है।</Text>
            ) : (
              combinedHistory.map(item => (
                <View key={item.id} style={styles.historyItemCard}>
                  <View style={styles.historyItemTop}>
                    <View style={styles.historyDateRow}>
                      <Calendar size={12} color={theme.colors.textSecondary} />
                      <Text style={styles.historyDateText}>{item.date}</Text>
                    </View>
                    <View
                      style={[
                        styles.historyItemBadge,
                        { backgroundColor: `${item.badgeColor}15` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyItemBadgeText,
                          { color: item.badgeColor },
                        ]}
                      >
                        {item.badge}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.historyItemContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyItemTitle}>{item.title}</Text>
                      <Text style={styles.historyItemSubtitle}>{item.subtitle}</Text>
                    </View>
                    <Text
                      style={[
                        styles.historyItemAmount,
                        item.isCredit ? { color: theme.colors.success } : { color: '#0F172A' },
                      ]}
                    >
                      {item.isCredit ? '+' : '-'} {formatRupees(item.amount)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* WhatsApp Review Modal */}
      <WhatsAppShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        statementData={statement}
        contractorName={contractorName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
    elevation: 2,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  headerIdCode: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  waHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: theme.spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileNameText: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: theme.colors.successLight,
  },
  statusPillInactive: {
    backgroundColor: '#E5E7EB',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextActive: {
    color: theme.colors.successDark,
  },
  statusTextInactive: {
    color: '#4B5563',
  },
  profileRoleText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  profileJoinDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  waActionButton: {
    backgroundColor: '#25D366',
  },
  payActionButton: {
    backgroundColor: theme.colors.primary,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  monthSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  monthSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  monthChips: {
    flexDirection: 'row',
    gap: 6,
  },
  monthChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  monthChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  monthChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  monthChipTextActive: {
    color: theme.colors.primaryDark,
  },
  statementCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: theme.spacing.xl,
  },
  statementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statementTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  statementSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  fullStatementLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  fullStatementLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  calcBreakdownCard: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calcRowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  calcRowAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  calcDivider: {
    height: 1,
    backgroundColor: theme.colors.surfaceBorder,
    marginVertical: 4,
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  remainingFormulaNote: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  remainingAmount: {
    fontSize: 22,
    fontWeight: '900',
  },
  contractorExpenseNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successLight,
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 10,
  },
  contractorExpenseNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.successDark,
    flex: 1,
  },
  historySection: {
    marginBottom: theme.spacing.xl,
  },
  historySectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  historyTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  historyTabPill: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  historyTabPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  historyTabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  historyTabPillTextActive: {
    color: '#FFF',
  },
  historyList: {
    gap: 8,
  },
  noHistoryText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  historyItemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  historyItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyDateText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  historyItemBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyItemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historyItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  historyItemSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  historyItemAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
});

