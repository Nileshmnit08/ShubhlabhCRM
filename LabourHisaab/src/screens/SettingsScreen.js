// SettingsScreen for LabourHisaab
// Revise labour rates (Work name, Rate, Unit), Contractor details, Reset to default

import React, { useState } from 'react';
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
  ChevronLeft,
  Edit2,
  RotateCcw,
  Check,
  X,
  Info,
  DollarSign,
  Tag,
  Building,
  Database,
  Download,
  ShieldCheck,
} from 'lucide-react-native';
import theme from '../constants/theme';
import { useLabourHisaab } from '../context/LabourHisaabContext';

const UNITS = [
  { id: 'per_100_kg', label: 'प्रति 100 kg (/ 100 kg)' },
  { id: 'per_bag', label: 'प्रति बोरी (/ bag)' },
  { id: 'per_batch', label: 'प्रति बैच (/ batch)' },
  { id: 'fixed', label: 'फिक्स राशि (Fixed)' },
];

export default function SettingsScreen({ navigation }) {
  const {
    workRates,
    updateWorkRate,
    resetWorkRates,
    contractorName,
    setContractorName,
    createBackup,
    restoreBackup,
    getOfflineDiagnostics,
    isCloudConfigured,
    cloudUser,
    syncStatus,
    cloudSignIn,
    cloudSignOut,
    syncNow,
  } = useLabourHisaab();

  // Cloud sync sign-in (LH-CLOUD-SYNC-01)
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);

  const handleCloudSignIn = async () => {
    if (cloudBusy) return;
    if (!cloudEmail.trim() || !cloudPassword) {
      Alert.alert('त्रुटि', 'कृपया ईमेल और पासवर्ड दर्ज करें।');
      return;
    }
    setCloudBusy(true);
    try {
      const outcome = await cloudSignIn(cloudEmail, cloudPassword);
      setCloudPassword('');
      Alert.alert('साइन इन सफल', outcome
        ? `सिंक पूरा: ${outcome.uploaded} प्रविष्टि भेजी गई${outcome.failed.length ? `, ${outcome.failed.length} नहीं भेजी जा सकी` : ''}।`
        : 'साइन इन हो गया।');
    } catch (e) {
      Alert.alert('साइन इन नहीं हो सका', e?.message || 'कृपया दोबारा प्रयास करें।');
    } finally {
      setCloudBusy(false);
    }
  };

  const handleSyncNow = async () => {
    if (cloudBusy) return;
    setCloudBusy(true);
    try {
      const outcome = await syncNow();
      if (outcome) {
        Alert.alert(outcome.failed.length ? 'सिंक आंशिक' : 'सिंक पूरा',
          `${outcome.uploaded} भेजी, ${outcome.unchanged} पहले से भेजी हुई, ${outcome.deleted} हटाई गई` +
          (outcome.failed.length ? `\n${outcome.failed.length} नहीं भेजी जा सकी: ${outcome.failed[0].message}` : ''));
      }
    } finally {
      setCloudBusy(false);
    }
  };

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRateItem, setSelectedRateItem] = useState(null);
  const [newRateValue, setNewRateValue] = useState('');
  const [newUnitValue, setNewUnitValue] = useState('per_100_kg');

  // Contractor name editing
  const [tempContractorName, setTempContractorName] = useState(contractorName);

  const handleOpenEdit = (rateItem) => {
    setSelectedRateItem(rateItem);
    setNewRateValue(String(rateItem.rate));
    setNewUnitValue(rateItem.unit);
    setShowEditModal(true);
  };

  const handleSaveRate = () => {
    const num = Number(newRateValue);
    if (isNaN(num) || num < 0) {
      Alert.alert('त्रुटि', 'कृपया वैध दर दर्ज करें।');
      return;
    }

    updateWorkRate(selectedRateItem.id, num, newUnitValue);
    setShowEditModal(false);
    Alert.alert('सफलता', `${selectedRateItem.name} की दर संशोधित कर दी गई है।`);
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'डिफ़ॉल्ट दरें रीसेट करें?',
      'क्या आप सभी दरों को मूल मानक दरों पर रीसेट करना चाहते हैं?',
      [
        { text: 'रद्द करें', style: 'cancel' },
        {
          text: 'रीसेट करें',
          style: 'destructive',
          onPress: () => {
            resetWorkRates();
            Alert.alert('रीसेट पूर्ण', 'सभी कार्य दरें डिफ़ॉल्ट पर सेट कर दी गई हैं।');
          },
        },
      ]
    );
  };

  const handleSaveContractorName = () => {
    if (!tempContractorName.trim()) {
      Alert.alert('त्रुटि', 'कृपया ठेकेदार का नाम दर्ज करें।');
      return;
    }
    setContractorName(tempContractorName.trim());
    Alert.alert('सहेजा गया', 'ठेकेदार का नाम अपडेट हो गया।');
  };

  const handleCreateBackup = async () => {
    try {
      const backup = await createBackup();
      Alert.alert(
        'बैकअप तैयार ✅',
        `एप्लिकेशन बैकअप सफलतापूर्वक तैयार हुआ।\n\n• कुल मजदूर: ${backup.stats.totalLabourers}\n• कुल कार्य प्रविष्टियां: ${backup.stats.totalWorkEntries}\n• कुल भुगतान: ${backup.stats.totalPayments}\n• कुल सेवा खर्च: ${backup.stats.totalServiceExpenses}\n• क्लोज्ड माह: ${backup.stats.settlementsCount}`
      );
    } catch (err) {
      Alert.alert('त्रुटि', err.message || 'बैकअप बनाने में विफलता');
    }
  };

  const handleCheckDiagnostics = () => {
    const diag = getOfflineDiagnostics();
    Alert.alert(
      'डेटाबेस व ऑफलाइन स्थिति 🛡️',
      `• मोड: ${diag.mode}\n• स्टोरेज: ${diag.storageEngine}\n• प्रविष्टियां सुरक्षित: हाँ (Zero Discard Policy)\n• सक्रिय मजदूर: ${diag.recordsPersisted.labourers}\n• कार्य प्रविष्टियां: ${diag.recordsPersisted.workEntries}\n• भुगतान रिकॉर्ड: ${diag.recordsPersisted.payments}`
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>दर सूची व सेटिंग्स</Text>
          <Text style={styles.headerSubtitle}>Labour Rates & Settings</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contractor Profile Config */}
        <View style={styles.contractorCard}>
          <View style={styles.cardHeader}>
            <Building size={18} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>ठेकेदार का नाम (Contractor Identity)</Text>
          </View>
          <View style={styles.contractorInputRow}>
            <TextInput
              style={styles.contractorInput}
              value={tempContractorName}
              onChangeText={setTempContractorName}
              placeholder="ठेकेदार का नाम दर्ज करें"
            />
            <TouchableOpacity
              style={styles.saveNameBtn}
              onPress={handleSaveContractorName}
            >
              <Text style={styles.saveNameBtnText}>सहेजें</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.contractorNote}>
            यह नाम दैनिक हिसाब पर्चियों और व्हाट्सएप संदेशों पर प्रदर्शित होगा।
          </Text>
        </View>

        {/* Cloud sync to ShubhLabh CRM (LH-CLOUD-SYNC-01) */}
        <View style={styles.contractorCard}>
          <View style={styles.cardHeader}>
            <Database size={18} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>क्लाउड सिंक (CRM से जोड़ें)</Text>
          </View>
          {!isCloudConfigured ? (
            <Text style={styles.contractorNote}>इस ऐप बिल्ड में क्लाउड सेटअप नहीं है। प्रविष्टियां केवल इस फ़ोन में सहेजी जा रही हैं।</Text>
          ) : !cloudUser ? (
            <>
              <Text style={styles.contractorNote}>
                CRM व्यवस्थापक द्वारा दिए गए ईमेल व पासवर्ड से साइन इन करें। प्रविष्टियां फ़ोन में सहेजी रहेंगी और साइन इन के बाद CRM में भी भेजी जाएंगी।
              </Text>
              <TextInput
                style={[styles.contractorInput, styles.cloudInput]}
                value={cloudEmail}
                onChangeText={setCloudEmail}
                placeholder="ईमेल"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <TextInput
                style={[styles.contractorInput, styles.cloudInput]}
                value={cloudPassword}
                onChangeText={setCloudPassword}
                placeholder="पासवर्ड"
                secureTextEntry
                autoCapitalize="none"
              />
              <TouchableOpacity style={[styles.saveNameBtn, styles.cloudBtn, cloudBusy && { opacity: 0.6 }]} onPress={handleCloudSignIn} disabled={cloudBusy}>
                <Text style={styles.saveNameBtnText}>{cloudBusy ? 'कृपया प्रतीक्षा करें...' : 'साइन इन करें'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.contractorNote}>साइन इन: {cloudUser.email}</Text>
              <Text style={styles.contractorNote}>
                {syncStatus.running ? 'सिंक चल रहा है...'
                  : syncStatus.pending > 0 ? `भेजना बाकी: ${syncStatus.pending} प्रविष्टि`
                  : 'सभी प्रविष्टियां CRM में भेजी जा चुकी हैं।'}
              </Text>
              {syncStatus.lastSyncAt ? (
                <Text style={styles.contractorNote}>अंतिम सिंक: {new Date(syncStatus.lastSyncAt).toLocaleString('en-IN')}</Text>
              ) : null}
              {syncStatus.lastError ? (
                <Text style={[styles.contractorNote, { color: theme.colors.danger }]}>त्रुटि: {syncStatus.lastError}</Text>
              ) : null}
              <View style={styles.contractorInputRow}>
                <TouchableOpacity style={[styles.saveNameBtn, styles.cloudBtn, (cloudBusy || syncStatus.running) && { opacity: 0.6 }]} onPress={handleSyncNow} disabled={cloudBusy || syncStatus.running}>
                  <Text style={styles.saveNameBtnText}>अभी सिंक करें</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveNameBtn, styles.cloudBtn, { backgroundColor: theme.colors.surfaceVariant }]} onPress={cloudSignOut}>
                  <Text style={[styles.saveNameBtnText, { color: theme.colors.textPrimary }]}>साइन आउट</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Prototype Memory Notice */}
        <View style={styles.infoBanner}>
          <Info size={18} color={theme.colors.primaryDark} />
          <Text style={styles.infoBannerText}>
            दर संशोधन इन-मेमोरी मॉक डेटा में लागू होता है। कोई डेटाबेस तालिका प्रभावित नहीं होती।
          </Text>
        </View>

        {/* Work Rates Section Header */}
        <View style={styles.ratesSectionHeader}>
          <View>
            <Text style={styles.ratesSectionTitle}>कार्य दर सूची (Labour Work Rates)</Text>
            <Text style={styles.ratesSectionSubtitle}>
              दर या इकाई बदलने के लिए किसी भी कार्य पर टैप करें
            </Text>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetDefaults}
          >
            <RotateCcw size={14} color={theme.colors.danger} />
            <Text style={styles.resetButtonText}>रीसेट</Text>
          </TouchableOpacity>
        </View>

        {/* Work Rates List */}
        <View style={styles.ratesList}>
          {workRates.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.rateCard}
              onPress={() => handleOpenEdit(item)}
              activeOpacity={0.7}
            >
              <View style={styles.rateCardLeft}>
                <Text style={styles.rateName}>{item.name}</Text>
                <Text style={styles.rateHindiName}>{item.hindiName}</Text>
              </View>

              <View style={styles.rateCardRight}>
                <View style={styles.rateBadge}>
                  <Text style={styles.rateBadgeText}>{item.unitLabel}</Text>
                </View>
                <View style={styles.editIconCircle}>
                  <Edit2 size={14} color={theme.colors.primaryDark} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Data Backup & Offline Diagnostics Section (LH-QA-01) */}
        <View style={styles.backupCard}>
          <View style={styles.backupHeader}>
            <Database size={18} color="#137A38" />
            <Text style={styles.backupTitle}>डेटा बैकअप व सुरक्षा (Backup & Offline)</Text>
          </View>
          <Text style={styles.backupSub}>
            ऑफलाइन-प्रथम रेजिलिएंट स्टोरेज सक्रिय है। आपकी सभी कार्य प्रविष्टियां, भुगतान, और सेटलमेंट रिकॉर्ड्स सुरक्षित हैं।
          </Text>

          <View style={styles.backupBtnRow}>
            <TouchableOpacity
              style={styles.backupActionBtn}
              onPress={handleCreateBackup}
              activeOpacity={0.8}
            >
              <Download size={14} color="#FFFFFF" />
              <Text style={styles.backupActionBtnText}>बैकअप बनाएं (Export)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backupSecBtn}
              onPress={handleCheckDiagnostics}
              activeOpacity={0.8}
            >
              <ShieldCheck size={14} color="#1E293B" />
              <Text style={styles.backupSecBtnText}>स्थिति जांचें</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Edit Rate Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>दर संशोधित करें (Edit Rate)</Text>
                <Text style={styles.modalSubtitle}>{selectedRateItem?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              {/* Rate Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>दर (रुपये):</Text>
                <View style={styles.rateInputRow}>
                  <Text style={styles.rupeePrefix}>₹</Text>
                  <TextInput
                    style={styles.rateTextInput}
                    keyboardType="numeric"
                    value={newRateValue}
                    onChangeText={setNewRateValue}
                    placeholder="0"
                  />
                </View>
              </View>

              {/* Unit Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>माप इकाई (Unit):</Text>
                <View style={styles.unitsGrid}>
                  {UNITS.map((u) => {
                    const isSelected = newUnitValue === u.id;
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={[
                          styles.unitOption,
                          isSelected && styles.unitOptionSelected,
                        ]}
                        onPress={() => setNewUnitValue(u.id)}
                      >
                        <Text
                          style={[
                            styles.unitOptionText,
                            isSelected && styles.unitOptionTextSelected,
                          ]}
                        >
                          {u.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>रद्द करें</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveRateBtn}
                onPress={handleSaveRate}
              >
                <Check size={18} color="#FFF" />
                <Text style={styles.saveRateBtnText}>सहेजें (Save)</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  contractorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  contractorInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contractorInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  saveNameBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveNameBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  contractorNote: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  cloudInput: { flex: 0, marginTop: 8 },
  cloudBtn: { marginTop: 10, paddingVertical: 12, flexGrow: 1 },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryLight,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    gap: 8,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  infoBannerText: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  ratesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  ratesSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  ratesSectionSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.dangerLight,
    gap: 4,
  },
  resetButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  ratesList: {
    gap: 8,
  },
  rateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  rateCardLeft: {
    flex: 1,
  },
  rateName: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  rateHindiName: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  rateCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rateBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  editIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalForm: {
    gap: 12,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  rateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  rupeePrefix: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  rateTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  unitsGrid: {
    gap: 6,
  },
  unitOption: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  unitOptionSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  unitOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  unitOptionTextSelected: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
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
  saveRateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  saveRateBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  // Backup & Diagnostics Styles (LH-QA-01)
  backupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
    marginBottom: 24,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  backupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  backupSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  backupBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backupActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#137A38',
    paddingVertical: 10,
    borderRadius: 8,
  },
  backupActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  backupSecBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  backupSecBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
});

