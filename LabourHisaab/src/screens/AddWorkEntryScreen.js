// AddWorkEntryScreen for LabourHisaab
// Dynamic form supporting weight-based (multi-line bag weights), per-bag, and batch-based work

import React, { useState, useMemo, useRef } from 'react';
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
  X,
  Plus,
  Trash2,
  Check,
  Scale,
  Package,
  Layers,
  Calculator,
  Calendar,
  Users,
} from 'lucide-react-native';
import theme from '../constants/theme';
import { useLabourHisaab } from '../context/LabourHisaabContext';
import { calculateWorkEntry, toNumberOrNull, validateWorkEntryInputs } from '../utils/calculations';
import { formatRupees } from '../utils/shareWhatsApp';
import { distributeWorkAllocation } from '../services/LabourDatabaseService';
import { makeEntryId } from '../services/LocalPersistence';
import { formatIstTime, formatIstDateTime, istToIso, isValidHm } from '../utils/dailyRegister';

const PRESET_WEIGHTS = [50, 40, 25, 30, 100];
const QUICK_BAG_ADDS = [50, 100, 200, 500];

export default function AddWorkEntryScreen({ navigation, route }) {
  const {
    selectedDate,
    workRates,
    addWorkEntry,
    updateWorkEntry,
    labourers,
  } = useLabourHisaab();

  const workEntryToEdit = route?.params?.workEntryToEdit;
  const initialCategoryId =
    route?.params?.preselectedCategoryId ||
    workEntryToEdit?.categoryId ||
    'mix';

  // Active category selection
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const selectedCategory = useMemo(() => {
    return workRates.find(r => r.id === selectedCategoryId) || workRates[0];
  }, [selectedCategoryId, workRates]);

  // Editable rate state
  const [customRate, setCustomRate] = useState(
    workEntryToEdit ? String(workEntryToEdit.rate) : String(selectedCategory.rate)
  );

  // Multi-line bag weights for weight-based work.
  // LH-HOME-LABOUR-ENTRY-01: quantities start empty (no hidden default count), and when
  // editing, a saved 0 stays 0 (?? instead of ||). 50 kg is only the usual bag size.
  const [bagLines, setBagLines] = useState(
    workEntryToEdit?.bagLines && workEntryToEdit.bagLines.length > 0
      ? workEntryToEdit.bagLines.map((b, i) => ({
          id: `line_${i + 1}`,
          bagWeightKg: String(b.bagWeightKg ?? b.weightKg ?? 50),
          bagCount: String(b.bagCount ?? b.bags ?? 0),
        }))
      : [{ id: 'line_1', bagWeightKg: '50', bagCount: '' }]
  );

  // Per-bag count
  const [totalBagsInput, setTotalBagsInput] = useState(
    workEntryToEdit ? String(workEntryToEdit.totalBags ?? 0) : ''
  );

  // Batch count
  const [totalBatchesInput, setTotalBatchesInput] = useState(
    workEntryToEdit ? String(workEntryToEdit.totalBatches ?? 0) : ''
  );

  // Prevents a double tap from saving the same entry twice.
  const savingRef = useRef(false);
  // Stable record id for this form (new entry) or the edited entry's id.
  const entryIdRef = useRef(workEntryToEdit?.id || makeEntryId());
  const [isSaving, setIsSaving] = useState(false);

  // Participating labourers (multi-select)
  const [selectedLabourerIds, setSelectedLabourerIds] = useState(
    workEntryToEdit?.participatingLabourerIds ||
    labourers.filter(l => l.isActive).map(l => l.id)
  );

  // Notes
  const [notes, setNotes] = useState(workEntryToEdit?.notes || '');

  // Work completed at (IST, 'HH:MM'). New entry: now. Old entries without a time stay blank
  // (shown as "—"), so no time is invented for them.
  const [completedHm, setCompletedHm] = useState(
    workEntryToEdit ? formatIstTime(workEntryToEdit.workCompletedAt) : formatIstTime(new Date().toISOString())
  );

  // Switch category handler
  const handleSelectCategory = (cat) => {
    setSelectedCategoryId(cat.id);
    setCustomRate(String(cat.rate));
  };

  // Weight lines handlers
  const handleAddBagLine = () => {
    setBagLines(prev => [
      ...prev,
      { id: `line_${Date.now()}`, bagWeightKg: '50', bagCount: '' },
    ]);
  };

  const handleUpdateBagLine = (index, field, value) => {
    setBagLines(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveBagLine = (index) => {
    if (bagLines.length <= 1) {
      Alert.alert('सूचना', 'कम से कम एक वजन लाइन आवश्यक है।');
      return;
    }
    setBagLines(prev => prev.filter((_, i) => i !== index));
  };

  // Toggle labourer participation
  const handleToggleLabourer = (id) => {
    setSelectedLabourerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllLabourers = () => {
    const activeIds = labourers.filter(l => l.isActive).map(l => l.id);
    if (selectedLabourerIds.length === activeIds.length) {
      setSelectedLabourerIds([]);
    } else {
      setSelectedLabourerIds(activeIds);
    }
  };

  // Live calculation. A rate of 0 stays 0 (it used to fall back to the category rate);
  // an empty rate previews as ₹0 and is blocked by validation on save.
  const calculationResult = useMemo(() => {
    const parsedRate = toNumberOrNull(customRate);
    const numericRate = Number.isFinite(parsedRate) ? parsedRate : 0;

    return calculateWorkEntry({
      rate: numericRate,
      unit: selectedCategory.unit,
      type: selectedCategory.type,
      bagLines: bagLines.map(line => ({
        bagWeightKg: Number(line.bagWeightKg) || 0,
        bagCount: Number(line.bagCount) || 0,
      })),
      totalBags: Number(totalBagsInput) || 0,
      totalBatches: Number(totalBatchesInput) || 0,
    });
  }, [selectedCategory, customRate, bagLines, totalBagsInput, totalBatchesInput]);

  // Live allocation breakdown with penny-perfect distribution
  const labourAllocations = useMemo(() => {
    return distributeWorkAllocation(calculationResult.totalAmount, selectedLabourerIds);
  }, [calculationResult.totalAmount, selectedLabourerIds]);

  // Save handler
  const handleSave = async () => {
    if (savingRef.current) return;

    // Empty required fields are errors; an explicit 0 is valid and saves a ₹0 entry.
    const validationError = validateWorkEntryInputs({
      type: selectedCategory.type,
      rate: customRate,
      bagLines,
      totalBags: totalBagsInput,
      totalBatches: totalBatchesInput,
      labourerCount: selectedLabourerIds.length,
    });
    if (validationError) {
      Alert.alert('त्रुटि', validationError);
      return;
    }
    const workDate = workEntryToEdit?.date ?? selectedDate;
    const hm = completedHm.trim();
    if (hm && !isValidHm(hm)) {
      Alert.alert('त्रुटि', 'काम पूरा होने का समय HH:MM (24 घंटे) में लिखें, जैसे 14:30।');
      return;
    }
    const workCompletedAt = hm ? istToIso(workDate, hm) : undefined;
    if (workCompletedAt && Date.parse(workCompletedAt) > Date.now() + 5 * 60000) {
      Alert.alert('त्रुटि', 'काम पूरा होने का समय भविष्य में नहीं हो सकता।');
      return;
    }

    const entryData = {
      // Same id for every attempt from this form: a retry replaces, never duplicates.
      id: entryIdRef.current,
      // Editing keeps the entry's own date; a new entry uses the selected date.
      date: workEntryToEdit?.date ?? selectedDate,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      rate: toNumberOrNull(customRate),
      unit: selectedCategory.unit,
      type: selectedCategory.type,
      bagLines: calculationResult.bagLines,
      totalBags: calculationResult.totalBags,
      totalKg: calculationResult.totalKg,
      totalBatches: calculationResult.totalBatches,
      fixedAmount: calculationResult.totalAmount,
      totalAmount: calculationResult.totalAmount,
      notes,
      participatingLabourerIds: selectedLabourerIds,
      ...(workCompletedAt ? { workCompletedAt } : {}),
    };

    savingRef.current = true;
    setIsSaving(true);
    try {
      // Saving work never creates a payment; payments are recorded separately.
      // Success is shown only after device storage has confirmed the write.
      if (workEntryToEdit) {
        const saved = await updateWorkEntry(workEntryToEdit.id, entryData);
        Alert.alert('सफलता', `${selectedCategory.name} का हिसाब ${formatRupees(saved.totalAmount)} पर अपडेट होकर सहेजा गया।`, [
          { text: 'ठीक है', onPress: () => navigation.goBack() },
        ], { cancelable: false });
      } else {
        const saved = await addWorkEntry(entryData);
        Alert.alert('सफलतापूर्वक सहेजा गया', `${selectedCategory.name} का ${formatRupees(saved.totalAmount)} फ़ोन में सहेज लिया गया।`, [
          { text: 'ठीक है', onPress: () => navigation.goBack() },
        ], { cancelable: false });
      }
      // Stay locked after success: the screen closes from the alert.
    } catch (e) {
      // Keep every entered value so the user can retry without re-typing.
      savingRef.current = false;
      setIsSaving(false);
      Alert.alert('त्रुटि', `कार्य प्रविष्टि सहेजी नहीं जा सकी। कृपया दोबारा कोशिश करें।${e?.message ? `\n(${e.message})` : ''}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {workEntryToEdit ? 'कार्य प्रविष्टि सम्पादित करें' : 'दैनिक कार्य प्रविष्टि'}
          </Text>
          <Text style={styles.headerSubtitle}>
            तारीख: {selectedDate} | {workEntryToEdit ? 'Edit Work Entry' : 'New Work Entry'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
          accessibilityLabel="बंद करें"
        >
          <X size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Work Category Selector */}
        <Text style={styles.sectionTitle}>1. कार्य का प्रकार चुनें (Select Work)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {workRates.map((cat) => {
            const isSelected = cat.id === selectedCategoryId;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && styles.selectedCategoryChip]}
                onPress={() => handleSelectCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryChipTitle,
                    isSelected && styles.selectedCategoryChipTitle,
                  ]}
                >
                  {cat.name}
                </Text>
                <Text
                  style={[
                    styles.categoryChipRate,
                    isSelected && styles.selectedCategoryChipRate,
                  ]}
                >
                  {cat.unitLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Rate Review / Edit Box */}
        <View style={styles.rateCard}>
          <View style={styles.rateInfoRow}>
            <View>
              <Text style={styles.rateCardTitle}>{selectedCategory.name}</Text>
              <Text style={styles.rateCardHindi}>{selectedCategory.hindiName}</Text>
            </View>
            <View style={styles.rateInputContainer}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.rateInput}
                keyboardType="numeric"
                value={customRate}
                onChangeText={setCustomRate}
                placeholder="Rate"
              />
              <Text style={styles.rateUnitSuffix}>{selectedCategory.unitShort}</Text>
            </View>
          </View>
        </View>

        {/* Step 2: Quantity Input depending on Work Type */}
        <Text style={styles.sectionTitle}>
          2. मात्रा दर्ज करें ({selectedCategory.type === 'weight' ? 'वजन व बोरियां' : selectedCategory.type === 'bag' ? 'बोरी संख्या' : 'बैच संख्या'})
        </Text>

        {/* --- WEIGHT-BASED WORK: Multiple Bag Weights supported --- */}
        {selectedCategory.type === 'weight' && (
          <View style={styles.weightSection}>
            <View style={styles.weightNoteBox}>
              <Scale size={16} color={theme.colors.primary} />
              <Text style={styles.weightNoteText}>
                एक ही कार्य में अलग-अलग वजन की बोरियां जोड़ सकते हैं।
              </Text>
            </View>

            {bagLines.map((line, idx) => {
              const lineKg = (Number(line.bagWeightKg) || 0) * (Number(line.bagCount) || 0);
              return (
                <View key={line.id} style={styles.bagLineCard}>
                  <View style={styles.bagLineHeader}>
                    <Text style={styles.bagLineTitle}>वजन लाइन #{idx + 1}</Text>
                    {bagLines.length > 1 && (
                      <TouchableOpacity
                        onPress={() => handleRemoveBagLine(idx)}
                        style={styles.removeLineBtn}
                      >
                        <Trash2 size={16} color={theme.colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.bagLineInputsRow}>
                    {/* Bag Weight Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>प्रति बोरी वजन (kg)</Text>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="numeric"
                        value={line.bagWeightKg}
                        onChangeText={(val) => handleUpdateBagLine(idx, 'bagWeightKg', val)}
                        placeholder="50"
                      />
                      {/* Quick preset chips */}
                      <View style={styles.presetChipsRow}>
                        {PRESET_WEIGHTS.map((w) => (
                          <TouchableOpacity
                            key={w}
                            style={[
                              styles.presetChip,
                              line.bagWeightKg === String(w) && styles.selectedPresetChip,
                            ]}
                            onPress={() => handleUpdateBagLine(idx, 'bagWeightKg', String(w))}
                          >
                            <Text
                              style={[
                                styles.presetChipText,
                                line.bagWeightKg === String(w) && styles.selectedPresetChipText,
                              ]}
                            >
                              {w}k
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Multiply Sign */}
                    <Text style={styles.mathSign}>×</Text>

                    {/* Bag Count Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>बोरियों की संख्या</Text>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="numeric"
                        value={line.bagCount}
                        onChangeText={(val) => handleUpdateBagLine(idx, 'bagCount', val)}
                        placeholder="100"
                      />
                      <Text style={styles.lineResultText}>= {lineKg} kg</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity style={styles.addLineButton} onPress={handleAddBagLine}>
              <Plus size={18} color={theme.colors.primary} />
              <Text style={styles.addLineButtonText}>+ अन्य वजन की बोरी जोड़ें</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- PER-BAG WORK --- */}
        {selectedCategory.type === 'bag' && (
          <View style={styles.singleInputCard}>
            <Text style={styles.inputLabel}>कुल बोरियों की संख्या (Total Bags)</Text>
            <TextInput
              style={[styles.textInput, styles.largeInput]}
              keyboardType="numeric"
              value={totalBagsInput}
              onChangeText={setTotalBagsInput}
              placeholder="बोरियां दर्ज करें"
            />
            {/* Quick Add Chips */}
            <View style={styles.quickAddRow}>
              {QUICK_BAG_ADDS.map((addVal) => (
                <TouchableOpacity
                  key={addVal}
                  style={styles.quickAddChip}
                  onPress={() => {
                    const current = Number(totalBagsInput) || 0;
                    setTotalBagsInput(String(current + addVal));
                  }}
                >
                  <Text style={styles.quickAddChipText}>+{addVal}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* --- BATCH-BASED WORK --- */}
        {selectedCategory.type === 'batch' && (
          <View style={styles.singleInputCard}>
            <Text style={styles.inputLabel}>कुल बैच संख्या (Total Batches)</Text>
            <TextInput
              style={[styles.textInput, styles.largeInput]}
              keyboardType="numeric"
              value={totalBatchesInput}
              onChangeText={setTotalBatchesInput}
              placeholder="बैच दर्ज करें"
            />
            <View style={styles.quickAddRow}>
              {[1, 2, 3, 5, 10].map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[
                    styles.quickAddChip,
                    totalBatchesInput === String(b) && styles.selectedPresetChip,
                  ]}
                  onPress={() => setTotalBatchesInput(String(b))}
                >
                  <Text
                    style={[
                      styles.quickAddChipText,
                      totalBatchesInput === String(b) && styles.selectedPresetChipText,
                    ]}
                  >
                    {b} बैच
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Real-Time Calculation Summary Card */}
        <View style={styles.calculationCard}>
          <View style={styles.calcHeaderRow}>
            <Calculator size={20} color={theme.colors.success} />
            <Text style={styles.calcHeaderTitle}>मजदूरी हिसाब गणना (Calculation)</Text>
          </View>

          <View style={styles.calcBreakdown}>
            {selectedCategory.type === 'weight' && (
              <>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>कुल वजन (Total kg):</Text>
                  <Text style={styles.calcValue}>{calculationResult.totalKg} कि.ग्रा.</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>कुल बोरियां (Total Bags):</Text>
                  <Text style={styles.calcValue}>{calculationResult.totalBags} बोरी</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>गणना सूत्र:</Text>
                  <Text style={styles.calcFormula}>
                    ({calculationResult.totalKg} ÷ 100) × ₹{customRate}
                  </Text>
                </View>
              </>
            )}

            {selectedCategory.type === 'bag' && (
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>गणना सूत्र:</Text>
                <Text style={styles.calcFormula}>
                  {calculationResult.totalBags} बोरी × ₹{customRate}
                </Text>
              </View>
            )}

            {selectedCategory.type === 'batch' && (
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>गणना सूत्र:</Text>
                <Text style={styles.calcFormula}>
                  {calculationResult.totalBatches} बैच × ₹{customRate}
                </Text>
              </View>
            )}

            <View style={styles.totalDivider} />

            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>कुल मजदूरी कमाई:</Text>
              <Text style={styles.finalTotalAmount}>
                {formatRupees(calculationResult.totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Step 4: Participating Labourers */}
        <View style={styles.labourersSection}>
          <View style={styles.labourerHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>3. कार्यरत मजदूर (Labourers)</Text>
              <Text style={styles.sectionSubtitle}>
                {selectedLabourerIds.length} मजदूर चयनित
              </Text>
            </View>
            <TouchableOpacity onPress={handleSelectAllLabourers}>
              <Text style={styles.selectAllText}>
                {selectedLabourerIds.length === labourers.filter(l => l.isActive).length
                  ? 'सभी हटाएं'
                  : 'सभी सक्रिय चुनें'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Allocation Preview Strip */}
          <View style={styles.allocationSummaryBanner}>
            <View style={styles.allocationBannerTopRow}>
              <Text style={styles.allocationBannerTitle}>मजदूरी बंटवारा (Allocation)</Text>
              <Text style={styles.allocationBannerTotal}>
                {formatRupees(calculationResult.totalAmount)}
              </Text>
            </View>
            <Text style={styles.allocationBannerSub}>
              {selectedLabourerIds.length > 0
                ? `${selectedLabourerIds.length} मजदूरों में बराबर विभाजन (~ ₹${(calculationResult.totalAmount / selectedLabourerIds.length).toFixed(2)} / मजदूर)`
                : 'कृपया कार्य में शामिल मजदूर चुनें'}
            </Text>
            {selectedLabourerIds.length > 0 && (
              <View style={styles.allocationCheckRow}>
                <Check size={14} color="#059669" />
                <Text style={styles.allocationCheckText}>✓ 100% सटीक मिलान (अंतर: ₹0.00)</Text>
              </View>
            )}
          </View>

          <View style={styles.labourerChipsGrid}>
            {labourers
              .filter(l => l.isActive)
              .map((lab) => {
                const isSelected = selectedLabourerIds.includes(lab.id);
                const alloc = labourAllocations.find(a => a.labourerId === lab.id);
                const shareAmount = alloc ? alloc.allocatedAmount : 0;

                return (
                  <TouchableOpacity
                    key={lab.id}
                    style={[
                      styles.labourerChip,
                      isSelected && styles.selectedLabourerChip,
                    ]}
                    onPress={() => handleToggleLabourer(lab.id)}
                  >
                    <View
                      style={[
                        styles.chipCheckCircle,
                        isSelected && styles.selectedChipCheckCircle,
                      ]}
                    >
                      {isSelected && <Check size={12} color="#FFF" />}
                    </View>
                    <View style={styles.labourerChipTextCol}>
                      <Text
                        style={[
                          styles.labourerChipName,
                          isSelected && styles.selectedLabourerChipName,
                        ]}
                      >
                        {lab.name}
                      </Text>
                      {isSelected && (
                        <Text style={styles.labourerChipShare}>
                          ₹ {shareAmount}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>

        {/* Work completed at (IST) */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>काम पूरा होने का समय (Work completed at, IST)</Text>
          <TextInput
            style={styles.textInput}
            value={completedHm}
            onChangeText={setCompletedHm}
            placeholder="HH:MM, जैसे 14:30"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
          <Text style={styles.sectionSubtitle}>
            प्रविष्टि दर्ज होने का समय अपने-आप सहेजा जाता है{workEntryToEdit?.createdAt ? ` (${formatIstDateTime(workEntryToEdit.createdAt)})` : ''}।
          </Text>
        </View>

        {/* Step 5: Optional Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>4. विवरण / टिप्पणी (Optional Notes)</Text>
          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="जैसे: सुबह की शिफ्ट, गाड़ी नंबर, गोदाम संख्या..."
            multiline
          />
        </View>

        {/* Save CTA */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Check size={20} color="#FFF" />
          <Text style={styles.saveButtonText}>
            {workEntryToEdit
              ? 'कार्य प्रविष्टि अपडेट करें (Update Work Entry)'
              : 'कार्य प्रविष्टि सहेजें (Save Work Entry)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
    elevation: 2,
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  categoriesRow: {
    gap: 10,
    paddingBottom: 4,
  },
  categoryChip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.surfaceBorder,
    minWidth: 110,
  },
  selectedCategoryChip: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  categoryChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  selectedCategoryChipTitle: {
    color: theme.colors.primaryDark,
  },
  categoryChipRate: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  selectedCategoryChipRate: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  rateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  rateInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  rateCardHindi: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  rupeeSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  rateInput: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 50,
    textAlign: 'center',
  },
  rateUnitSuffix: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  weightSection: {
    gap: 10,
  },
  weightNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 4,
  },
  weightNoteText: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    fontWeight: '600',
    flex: 1,
  },
  bagLineCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  bagLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bagLineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  removeLineBtn: {
    padding: 4,
  },
  bagLineInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  mathSign: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: 18,
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  presetChip: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  selectedPresetChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  selectedPresetChipText: {
    color: '#FFF',
  },
  lineResultText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.success,
    marginTop: 6,
  },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    gap: 6,
    marginTop: 4,
  },
  addLineButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  singleInputCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  largeInput: {
    fontSize: 20,
    paddingVertical: 12,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickAddChip: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  quickAddChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  calculationCard: {
    backgroundColor: theme.colors.successLight,
    borderColor: '#A7F3D0',
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  calcHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  calcHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.successDark,
  },
  calcBreakdown: {
    gap: 6,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  calcFormula: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#065F46',
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#A7F3D0',
    marginVertical: 6,
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finalTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  finalTotalAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.successDark,
  },
  labourersSection: {
    marginTop: theme.spacing.lg,
  },
  labourerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  allocationSummaryBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  allocationBannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocationBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  allocationBannerTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
  },
  allocationBannerSub: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
    fontWeight: '500',
  },
  allocationCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  allocationCheckText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  labourerChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  labourerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    gap: 8,
  },
  selectedLabourerChip: {
    backgroundColor: '#FFF7ED',
    borderColor: theme.colors.primary,
  },
  chipCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChipCheckCircle: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  labourerChipTextCol: {
    flexDirection: 'column',
  },
  labourerChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  selectedLabourerChipName: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  labourerChipShare: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    marginTop: 1,
  },
  notesSection: {
    marginTop: theme.spacing.lg,
  },
  notesInput: {
    height: 70,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
    marginTop: theme.spacing.xl,
    elevation: 3,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

