// LabourListScreen for LabourHisaab
// Labourer Management: Add, Rename, Toggle Active/Inactive, Search, Stable IDs

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import {
  Search,
  UserPlus,
  Edit2,
  Power,
  ChevronRight,
  Phone,
  Check,
  X,
  Users,
  ShieldAlert,
} from 'lucide-react-native';
import theme from '../constants/theme';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { useLabourHisaab } from '../context/LabourHisaabContext';
import { formatRupees } from '../utils/shareWhatsApp';

export default function LabourListScreen({ navigation }) {
  const {
    labourers,
    addLabourer,
    renameLabourer,
    toggleLabourerStatus,
    getLabourerStatement,
    selectedMonth,
  } = useLabourHisaab();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'all' | 'active' | 'inactive'

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [targetLabourer, setTargetLabourer] = useState(null);

  // Form states for Add Labourer
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('सामान्य मजदूर');
  const [newNotes, setNewNotes] = useState('');

  // Form state for Rename
  const [renameValue, setRenameValue] = useState('');

  // Filtered labourers
  const filteredLabourers = useMemo(() => {
    return labourers.filter((lab) => {
      // Status filter
      if (statusFilter === 'active' && !lab.isActive) return false;
      if (statusFilter === 'inactive' && lab.isActive) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = lab.name.toLowerCase().includes(q);
        const matchId = lab.id.toLowerCase().includes(q);
        const matchPhone = (lab.phone || '').includes(q);
        const matchRole = (lab.role || '').toLowerCase().includes(q);
        return matchName || matchId || matchPhone || matchRole;
      }
      return true;
    });
  }, [labourers, statusFilter, searchQuery]);

  // Handler: Add Labourer
  const handleAddLabourerSubmit = () => {
    if (!newName.trim()) {
      Alert.alert('त्रुटि', 'कृपया मजदूर का नाम दर्ज करें।');
      return;
    }
    const created = addLabourer({
      name: newName,
      phone: newPhone,
      role: newRole,
      notes: newNotes,
    });
    setNewName('');
    setNewPhone('');
    setNewNotes('');
    setShowAddModal(false);
    Alert.alert('सफलता', `${created.name} (आईडी: ${created.id}) को सफलतापूर्वक जोड़ दिया गया।`);
  };

  // Handler: Open Rename Modal
  const handleOpenRename = (lab) => {
    setTargetLabourer(lab);
    setRenameValue(lab.name);
    setShowRenameModal(true);
  };

  // Handler: Save Rename (STRICT: Stable ID preserved)
  const handleRenameSubmit = () => {
    if (!renameValue.trim()) {
      Alert.alert('त्रुटि', 'कृपया वैध नाम दर्ज करें।');
      return;
    }
    renameLabourer(targetLabourer.id, renameValue);
    setShowRenameModal(false);
    Alert.alert('नाम अपडेट हुआ', `मजदूर का नाम बदलकर "${renameValue.trim()}" कर दिया गया। आईडी (${targetLabourer.id}) व इतिहास सुरक्षित है।`);
  };

  // Handler: Toggle Active/Inactive
  const handleToggleStatus = (lab) => {
    const actionText = lab.isActive ? 'निष्क्रिय' : 'सक्रिय';
    Alert.alert(
      `${actionText} करें?`,
      `क्या आप ${lab.name} को ${actionText} करना चाहते हैं?`,
      [
        { text: 'रद्द करें', style: 'cancel' },
        {
          text: actionText,
          onPress: () => toggleLabourerStatus(lab.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Header
        title="मज़दूर प्रबंधन"
        subtitle={`${labourers.filter(l => l.isActive).length} सक्रिय मजदूर | Labour Management`}
        showSettings={false}
      />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="नाम, कोड या मोबाइल से खोजें..."
            placeholderTextColor={theme.colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips & Add Button Row */}
        <View style={styles.filterActionRow}>
          <View style={styles.filterChipsRow}>
            <TouchableOpacity
              style={[styles.filterChip, statusFilter === 'active' && styles.filterChipActive]}
              onPress={() => setStatusFilter('active')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === 'active' && styles.filterChipTextActive,
                ]}
              >
                सक्रिय ({labourers.filter(l => l.isActive).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
              onPress={() => setStatusFilter('all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === 'all' && styles.filterChipTextActive,
                ]}
              >
                सभी ({labourers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, statusFilter === 'inactive' && styles.filterChipActive]}
              onPress={() => setStatusFilter('inactive')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === 'inactive' && styles.filterChipTextActive,
                ]}
              >
                निष्क्रिय ({labourers.filter(l => !l.isActive).length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Labourer Button */}
          <TouchableOpacity
            style={styles.addLabourerBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <UserPlus size={16} color="#FFF" />
            <Text style={styles.addLabourerBtnText}>+ नया मजदूर</Text>
          </TouchableOpacity>
        </View>

        {/* Labourers List */}
        <ScrollView
          style={styles.listScrollView}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredLabourers.length === 0 ? (
            <EmptyState
              title="कोई मजदूर नहीं मिला"
              subtitle="खोज शब्द बदलें या नया मजदूर जोड़ें"
              buttonText="नया मजदूर जोड़ें"
              onPressButton={() => setShowAddModal(true)}
              icon={Users}
            />
          ) : (
            filteredLabourers.map((lab) => {
              const statement = getLabourerStatement(lab.id, selectedMonth);
              return (
                <TouchableOpacity
                  key={lab.id}
                  style={[styles.labourerCard, !lab.isActive && styles.inactiveCard]}
                  onPress={() => navigation.navigate('LabourDetailScreen', { labourerId: lab.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardMainRow}>
                    {/* Avatar Circle */}
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: lab.isActive ? lab.avatarColor : '#94A3B8' },
                      ]}
                    >
                      <Text style={styles.avatarInitials}>
                        {lab.name.slice(0, 2).trim()}
                      </Text>
                    </View>

                    {/* Labourer Info */}
                    <View style={styles.labourerDetails}>
                      <View style={styles.nameIdRow}>
                        <Text style={styles.labourerNameText}>{lab.name}</Text>
                        <View style={styles.idBadge}>
                          <Text style={styles.idBadgeText}>{lab.id}</Text>
                        </View>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={styles.roleText}>{lab.role}</Text>
                        {lab.phone && (
                          <View style={styles.phoneChip}>
                            <Phone size={10} color={theme.colors.textSecondary} />
                            <Text style={styles.phoneText}>{lab.phone}</Text>
                          </View>
                        )}
                      </View>

                      {/* Month Earnings / Balance Snapshot */}
                      <View style={styles.balanceSnapshotRow}>
                        <Text style={styles.balanceSnapshotText}>
                          कमाई: {formatRupees(statement.totalLabourEarned)} | भुगतान: {formatRupees(statement.totalAmountPaid)}
                        </Text>
                        <Text
                          style={[
                            styles.balanceText,
                            statement.remainingBalance > 0
                              ? styles.balanceDueText
                              : styles.balanceClearText,
                          ]}
                        >
                          बकाया: {formatRupees(statement.remainingBalance)}
                        </Text>
                      </View>
                    </View>

                    <ChevronRight size={18} color={theme.colors.textMuted} />
                  </View>

                  {/* Actions Bar */}
                  <View style={styles.cardActionsBar}>
                    {/* Active/Inactive Toggle */}
                    <TouchableOpacity
                      style={[
                        styles.actionPill,
                        lab.isActive ? styles.statusActivePill : styles.statusInactivePill,
                      ]}
                      onPress={() => handleToggleStatus(lab)}
                    >
                      <Power size={12} color={lab.isActive ? theme.colors.successDark : '#4B5563'} />
                      <Text
                        style={[
                          styles.actionPillText,
                          lab.isActive ? styles.statusActiveText : styles.statusInactiveText,
                        ]}
                      >
                        {lab.isActive ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'}
                      </Text>
                    </TouchableOpacity>

                    {/* Rename Button */}
                    <TouchableOpacity
                      style={styles.renamePill}
                      onPress={() => handleOpenRename(lab)}
                    >
                      <Edit2 size={12} color={theme.colors.primaryDark} />
                      <Text style={styles.renamePillText}>नाम बदलें</Text>
                    </TouchableOpacity>

                    {/* View Statement Shortcut */}
                    <TouchableOpacity
                      style={styles.historyPill}
                      onPress={() =>
                        navigation.navigate('IndividualStatementModal', { labourerId: lab.id })
                      }
                    >
                      <Text style={styles.historyPillText}>हिसाब पर्ची 📄</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* ======================================================== */}
      {/* MODAL 1: ADD LABOURER */}
      {/* ======================================================== */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>+ नया मजदूर जोड़ें</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>मजदूर का नाम *</Text>
                <TextInput
                  style={styles.formInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="उदा. रमेश कुमार"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>मोबाइल नंबर</Text>
                <TextInput
                  style={styles.formInput}
                  keyboardType="phone-pad"
                  value={newPhone}
                  onChangeText={setNewPhone}
                  placeholder="उदा. 9829012345"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>कार्य प्रकार / भूमिका</Text>
                <TextInput
                  style={styles.formInput}
                  value={newRole}
                  onChangeText={setNewRole}
                  placeholder="उदा. लोडिंग वर्कर / मिस्त्री / सिलाई"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>टिप्पणी / विवरण</Text>
                <TextInput
                  style={styles.formInput}
                  value={newNotes}
                  onChangeText={setNewNotes}
                  placeholder="उदा. निवासी, विशेष कौशल"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>रद्द करें</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAddLabourerSubmit}
              >
                <Check size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>मजदूर जोड़ें</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: RENAME LABOURER (Strict: Preserves Stable ID & History) */}
      {/* ======================================================== */}
      <Modal visible={showRenameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>मजदूर का नाम संशोधित करें</Text>
              <TouchableOpacity onPress={() => setShowRenameModal(false)}>
                <X size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.idPreserveNotice}>
              <ShieldAlert size={18} color={theme.colors.primaryDark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.idPreserveTitle}>स्थिर लेबर कोड (Stable Local ID)</Text>
                <Text style={styles.idPreserveCode}>{targetLabourer?.id}</Text>
                <Text style={styles.idPreserveText}>
                  नाम बदलने पर भी पूर्व में दर्ज कार्य, भुगतान व हिसाब सुरक्षित रहेगा।
                </Text>
              </View>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>नया नाम दर्ज करें</Text>
                <TextInput
                  style={styles.formInput}
                  value={renameValue}
                  onChangeText={setRenameValue}
                  placeholder="नया नाम दर्ज करें"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={styles.cancelBtnText}>रद्द करें</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleRenameSubmit}
              >
                <Check size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>नाम सहेजें</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: theme.spacing.md,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  filterActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.primaryDark,
  },
  addLabourerBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    elevation: 2,
  },
  addLabourerBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  listScrollView: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
    gap: 10,
  },
  labourerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  labourerDetails: {
    flex: 1,
  },
  nameIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labourerNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  idBadge: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  roleText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  phoneText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  balanceSnapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
  },
  balanceSnapshotText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '800',
  },
  balanceDueText: {
    color: theme.colors.danger,
  },
  balanceClearText: {
    color: theme.colors.success,
  },
  cardActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusActivePill: {
    backgroundColor: theme.colors.successLight,
  },
  statusInactivePill: {
    backgroundColor: '#E5E7EB',
  },
  actionPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusActiveText: {
    color: theme.colors.successDark,
  },
  statusInactiveText: {
    color: '#4B5563',
  },
  renamePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  renamePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  historyPill: {
    marginLeft: 'auto',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalForm: {
    gap: 12,
  },
  formGroup: {
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  formInput: {
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: theme.spacing.lg,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  idPreserveNotice: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryLight,
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  idPreserveTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  idPreserveCode: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  idPreserveText: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    marginTop: 3,
  },
});

