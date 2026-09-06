import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, TextInput,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building2, Package, Scale, CalendarDays, ChevronDown,
  Sparkles, CheckCircle2, AlertCircle, Minus, Plus,
} from 'lucide-react-native';

// ─── Controlled Options ────────────────────────────────────────────────────────
// Derived from existing products table (Sprint 5 & Sprint 20) + existing fields
const PRODUCT_TYPES = [
  'Broiler Pre-Starter', 'Broiler Starter', 'Broiler Finisher',
  'Layer Chick Mash', 'Layer Grower Mash', 'Layer Phase 1',
  'Pallet', 'Pallet Naman', 'Pallet Gori', 'Pallet Shubh Labh',
  'Pallet Diamond', 'Pallet 8000',
  'Mix - Lapti', 'Mix Sukha Powder Base', 'Mix Pallet + Khal + Kakde',
];

const UNITS = ['Bags', 'MT', 'KG', 'Tonnes', 'Quintal'];

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low', status: 'default' },
  { value: 'Normal', label: 'Normal', status: 'info' },
  { value: 'High', label: 'High', status: 'warning' },
  { value: 'Urgent', label: 'Urgent', status: 'error' },
];

const INTENT_OPTIONS = [
  { value: 'Product Interest', label: 'Product Interest' },
  { value: 'Price Discussion', label: 'Price Discussion' },
  { value: 'Quotation Requested', label: 'Quotation Requested' },
  { value: 'Order Intention', label: 'Order Intention' },
];

// ─── Inline Selector Sheet (lightweight bottom-sheet style) ───────────────────
function SelectorSheet({ visible, title, options, selected, onSelect, onClose }) {
  if (!visible) return null;
  return (
    <View style={selectorStyles.overlay}>
      <TouchableOpacity style={selectorStyles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={selectorStyles.sheet}>
        <View style={selectorStyles.sheetHandle} />
        <Text style={selectorStyles.sheetTitle}>{title}</Text>
        <ScrollView style={selectorStyles.optionList} showsVerticalScrollIndicator={false}>
          {options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lbl = typeof opt === 'string' ? opt : opt.label;
            const isSelected = selected === val;
            return (
              <TouchableOpacity
                key={val}
                style={[selectorStyles.option, isSelected && selectorStyles.optionSelected]}
                onPress={() => { onSelect(val); onClose(); }}
              >
                <Text style={[selectorStyles.optionText, isSelected && selectorStyles.optionTextSelected]}>
                  {lbl}
                </Text>
                {isSelected && <CheckCircle2 size={18} color={theme.colors.secondary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const selectorStyles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,28,48,0.4)' },
  sheet: { backgroundColor: theme.colors.surfaceContainerLowest, borderTopLeftRadius: theme.borders.radius.lg, borderTopRightRadius: theme.borders.radius.lg, maxHeight: '70%', paddingBottom: 32 },
  sheetHandle: { width: 40, height: 4, backgroundColor: theme.colors.outlineVariant, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  sheetTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface, paddingHorizontal: 20, marginBottom: 8 },
  optionList: { paddingHorizontal: 8 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderRadius: theme.borders.radius.md, marginBottom: 2 },
  optionSelected: { backgroundColor: theme.colors.surfaceContainerLow },
  optionText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface },
  optionTextSelected: { color: theme.colors.secondary, fontWeight: theme.typography.weights.semibold },
});

// ─── Segmented Control ─────────────────────────────────────────────────────────
function SegmentedControl({ options, value, onChange }) {
  return (
    <View style={segStyles.track}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[segStyles.seg, isActive && segStyles.segActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[segStyles.segText, isActive && segStyles.segTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: theme.colors.surfaceContainer, borderRadius: theme.borders.radius.md, padding: 4, gap: 4 },
  seg: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  segActive: { backgroundColor: theme.colors.surfaceContainerLowest, ...theme.shadows.sm },
  segText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, fontWeight: theme.typography.weights.medium, color: theme.colors.onSurfaceVariant },
  segTextActive: { color: theme.colors.onSurface, fontWeight: theme.typography.weights.semibold },
});

// ─── Selector Row (triggers a SelectorSheet) ──────────────────────────────────
function SelectorRow({ label, value, placeholder, onPress, error }) {
  return (
    <View style={rowStyles.container}>
      {label ? <Text style={rowStyles.label}>{label}</Text> : null}
      <TouchableOpacity style={[rowStyles.row, error && rowStyles.rowError]} onPress={onPress} activeOpacity={0.7}>
        <Text style={[rowStyles.value, !value && rowStyles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <ChevronDown size={20} color={theme.colors.onSurfaceVariant} />
      </TouchableOpacity>
      {error ? <Text style={rowStyles.error}>{error}</Text> : null}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: { marginBottom: theme.spacing.lg },
  label: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: theme.typography.weights.semibold, color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.xs, letterSpacing: 0.1 },
  row: { flexDirection: 'row', alignItems: 'center', height: 48, backgroundColor: theme.colors.surfaceContainerLowest, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: theme.borders.radius.md, paddingHorizontal: theme.spacing.lg },
  rowError: { borderColor: theme.colors.error, borderWidth: 1.5 },
  value: { flex: 1, fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface },
  placeholder: { color: theme.colors.onSurfaceVariant },
  error: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.error, fontSize: theme.typography.sizes.labelMd, marginTop: theme.spacing.xs },
});

// ─── Quantity Stepper ──────────────────────────────────────────────────────────
function QuantityStepper({ value, onChange, unit }) {
  const numVal = parseInt(value, 10) || 0;

  const decrement = () => { if (numVal > 1) onChange(String(numVal - 1)); };
  const increment = () => onChange(String(numVal + 1));

  return (
    <View style={stepperStyles.container}>
      <TouchableOpacity style={stepperStyles.btn} onPress={decrement} activeOpacity={0.7}>
        <Minus size={20} color={theme.colors.onSurface} />
      </TouchableOpacity>
      <View style={stepperStyles.valueBox}>
        <TextInput
          style={stepperStyles.input}
          keyboardType="number-pad"
          value={String(numVal)}
          onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
          selectTextOnFocus
        />
        <Text style={stepperStyles.unit}>{unit}</Text>
      </View>
      <TouchableOpacity style={stepperStyles.btn} onPress={increment} activeOpacity={0.7}>
        <Plus size={20} color={theme.colors.secondary} />
      </TouchableOpacity>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceContainerLowest, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: theme.borders.radius.md, height: 56 },
  btn: { width: 56, height: '100%', alignItems: 'center', justifyContent: 'center' },
  valueBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  input: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineSm, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface, textAlign: 'center', minWidth: 60 },
  unit: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant },
});

// ─── Success State ─────────────────────────────────────────────────────────────
function SuccessView({ requirement, partyName, onViewDetail, onAddAnother, onBackToCustomer }) {
  return (
    <View style={successStyles.container}>
      <View style={successStyles.card}>
        <View style={successStyles.iconBox}>
          <CheckCircle2 size={48} color={theme.colors.success} />
        </View>
        <Text style={successStyles.title}>Requirement Added</Text>
        <Text style={successStyles.subtitle}>
          Successfully captured for{'\n'}
          <Text style={successStyles.customerName}>{partyName}</Text>
        </Text>

        <View style={successStyles.summaryBox}>
          <View style={successStyles.summaryRow}>
            <Text style={successStyles.summaryLabel}>Product</Text>
            <Text style={successStyles.summaryValue}>{requirement.product_type}</Text>
          </View>
          <View style={successStyles.summaryRow}>
            <Text style={successStyles.summaryLabel}>Quantity</Text>
            <Text style={successStyles.summaryValue}>{requirement.quantity} {requirement.unit}</Text>
          </View>
          <View style={successStyles.summaryRow}>
            <Text style={successStyles.summaryLabel}>Priority</Text>
            <Text style={successStyles.summaryValue}>{requirement.priority}</Text>
          </View>
          <View style={successStyles.summaryRow}>
            <Text style={successStyles.summaryLabel}>Intent</Text>
            <Text style={successStyles.summaryValue}>{requirement.intent_type}</Text>
          </View>
        </View>

        <View style={successStyles.actions}>
          <Button title="View Requirement" onPress={onViewDetail} variant="secondary" style={successStyles.btn} />
          <Button title="Add Another" onPress={onAddAnother} variant="outline" style={successStyles.btn} />
          <TouchableOpacity style={successStyles.backLink} onPress={onBackToCustomer}>
            <Text style={successStyles.backLinkText}>← Back to Customer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const successStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', padding: theme.spacing['screen-edge'] },
  card: { backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borders.radius.lg, padding: theme.spacing.xl, ...theme.shadows.md, alignItems: 'center' },
  iconBox: { width: 80, height: 80, backgroundColor: theme.colors.successContainer, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg },
  title: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineLg, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface, marginBottom: theme.spacing.sm },
  subtitle: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: theme.spacing.xl },
  customerName: { color: theme.colors.secondary, fontWeight: theme.typography.weights.semibold },
  summaryBox: { width: '100%', backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.md, padding: theme.spacing.lg, marginBottom: theme.spacing.xl },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  summaryLabel: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSurfaceVariant },
  summaryValue: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, fontWeight: theme.typography.weights.semibold, color: theme.colors.onSurface },
  actions: { width: '100%', gap: theme.spacing.md },
  btn: { width: '100%' },
  backLink: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  backLinkText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.secondary },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function AddRequirementScreen({ route, navigation }) {
  const { partyId, partyName } = route.params;
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();

  // Form state
  const [productType, setProductType] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('Bags');
  const [priority, setPriority] = useState('Normal');
  const [intentType, setIntentType] = useState('Product Interest');
  const [expectedDate, setExpectedDate] = useState('');
  const [expectedRate, setExpectedRate] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [savedRequirement, setSavedRequirement] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false); // anti-double-submit guard

  // Sheet visibility
  const [productSheet, setProductSheet] = useState(false);
  const [unitSheet, setUnitSheet] = useState(false);
  const [intentSheet, setIntentSheet] = useState(false);

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};

    if (!productType.trim()) {
      newErrors.productType = 'Product is required.';
    }

    const qty = parseInt(quantity, 10);
    if (!quantity || isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Quantity must be at least 1.';
    }

    if (expectedDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(expectedDate)) {
        newErrors.expectedDate = 'Use YYYY-MM-DD format (e.g. 2026-09-15).';
      } else {
        const parsed = new Date(expectedDate);
        if (isNaN(parsed.getTime())) {
          newErrors.expectedDate = 'Invalid date.';
        }
      }
    }

    if (expectedRate && isNaN(parseFloat(expectedRate))) {
      newErrors.expectedRate = 'Expected rate must be a number.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitting) return; // prevent double-tap
    if (!validate()) return;

    setSubmitting(true);
    setSaving(true);

    try {
      const payload = {
        party_id: partyId,
        product_type: productType.trim(),
        quantity: parseInt(quantity, 10),
        unit,
        priority,
        intent_type: intentType,
        status: 'Open',
        assigned_to: userProfile?.id ?? null,
        expected_date: expectedDate.trim() || null,
        expected_rate: expectedRate ? parseFloat(expectedRate) : null,
        notes: notes.trim() || null,
      };

      const { data, error } = await supabase
        .from('requirements')
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.code === '42501') {
          setErrors({ _global: 'Permission denied. You are not authorized to add requirements.' });
        } else if (error.code === '23503') {
          setErrors({ _global: 'Invalid customer reference. Please go back and try again.' });
        } else if (error.message?.includes('network')) {
          setErrors({ _global: 'Network error. Please check your connection and try again.' });
        } else {
          setErrors({ _global: 'Failed to save requirement. Please try again.' });
        }
        console.error('[AddRequirement] Supabase error:', error.code, error.message);
        return;
      }

      setSavedRequirement(data);
    } catch (err) {
      console.error('[AddRequirement] Unexpected error:', err);
      setErrors({ _global: 'An unexpected error occurred. Please try again.' });
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    setProductType('');
    setQuantity('1');
    setUnit('Bags');
    setPriority('Normal');
    setIntentType('Product Interest');
    setExpectedDate('');
    setExpectedRate('');
    setNotes('');
    setErrors({});
    setSavedRequirement(null);
  };

  // ─── Success View ────────────────────────────────────────────────────────────
  if (savedRequirement) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScreenHeader title="Requirement Added" showBack={false} />
        <SuccessView
          requirement={savedRequirement}
          partyName={partyName}
          onViewDetail={() => navigation.replace('RequirementDetail', { requirementId: savedRequirement.id, partyName })}
          onAddAnother={handleAddAnother}
          onBackToCustomer={() => navigation.goBack()}
        />
      </View>
    );
  }

  // ─── Form View ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Add Requirement"
        showBack={true}
        subtitle={partyName}
      />

      {/* Sheets */}
      <SelectorSheet visible={productSheet} title="Select Product" options={PRODUCT_TYPES} selected={productType} onSelect={setProductType} onClose={() => setProductSheet(false)} />
      <SelectorSheet visible={unitSheet} title="Select Unit" options={UNITS} selected={unit} onSelect={setUnit} onClose={() => setUnitSheet(false)} />
      <SelectorSheet visible={intentSheet} title="Requirement Intent" options={INTENT_OPTIONS} selected={intentType} onSelect={setIntentType} onClose={() => setIntentSheet(false)} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: theme.spacing['screen-edge'], paddingTop: theme.spacing.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Global Error Banner */}
          {errors._global && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={theme.colors.onErrorContainer} />
              <Text style={styles.errorBannerText}>{errors._global}</Text>
            </View>
          )}

          {/* Customer Context Card */}
          <View style={styles.customerContextCard}>
            <View style={styles.customerIconBox}>
              <Building2 size={20} color={theme.colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contextLabel}>Adding requirement for</Text>
              <Text style={styles.contextName} numberOfLines={1}>{partyName}</Text>
            </View>
          </View>

          {/* Section: Product & Intent */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Package size={18} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>Product & Intent</Text>
            </View>

            <SelectorRow
              label="Product *"
              value={productType}
              placeholder="Select product..."
              onPress={() => setProductSheet(true)}
              error={errors.productType}
            />

            <Text style={styles.fieldLabel}>Intent</Text>
            <SegmentedControl
              options={INTENT_OPTIONS}
              value={intentType}
              onChange={setIntentType}
            />
            <View style={{ height: theme.spacing.lg }} />
          </View>

          {/* Section: Quantity */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Scale size={18} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>Quantity</Text>
            </View>

            <Text style={styles.fieldLabel}>Bags / Units *</Text>
            <QuantityStepper value={quantity} onChange={setQuantity} unit={unit} />
            {errors.quantity && <Text style={styles.fieldError}>{errors.quantity}</Text>}

            <View style={{ height: theme.spacing.md }} />

            <SelectorRow
              label="Unit"
              value={unit}
              placeholder="Bags"
              onPress={() => setUnitSheet(true)}
            />

            <Input
              label="Expected Rate (₹ per unit)"
              placeholder="e.g. 1250"
              value={expectedRate}
              onChangeText={setExpectedRate}
              keyboardType="decimal-pad"
              error={errors.expectedRate}
            />
          </View>

          {/* Section: Priority & Timeline */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <CalendarDays size={18} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>Priority & Timeline</Text>
            </View>

            <Text style={styles.fieldLabel}>Priority</Text>
            <SegmentedControl
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={setPriority}
            />
            <View style={{ height: theme.spacing.lg }} />

            <Input
              label="Expected Delivery Date"
              placeholder="YYYY-MM-DD"
              value={expectedDate}
              onChangeText={setExpectedDate}
              keyboardType="numbers-and-punctuation"
              error={errors.expectedDate}
            />
          </View>

          {/* Section: Notes */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Sparkles size={18} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>

            <View style={styles.notesInputContainer}>
              <TextInput
                style={styles.notesInput}
                placeholder="Any additional context, specific requirements, or customer remarks..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Save Dock */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.dockInner}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : (
              <Text style={styles.saveBtnText}>Save Requirement</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.errorContainer,
    padding: theme.spacing.lg, borderRadius: theme.borders.radius.md, marginBottom: theme.spacing.lg, gap: 10,
  },
  errorBannerText: {
    fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onErrorContainer, flex: 1,
  },

  customerContextCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borders.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.colors.border, gap: 12,
  },
  customerIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: theme.colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.sm,
  },
  contextLabel: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, marginBottom: 2 },
  contextName: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },

  sectionCard: {
    backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borders.radius.lg,
    padding: theme.spacing.lg, marginBottom: theme.spacing.lg, ...theme.shadows.sm,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.lg },
  sectionTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },

  fieldLabel: {
    fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg,
    fontWeight: theme.typography.weights.semibold, color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.sm, letterSpacing: 0.1,
  },
  fieldError: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.error, fontSize: theme.typography.sizes.labelMd, marginTop: theme.spacing.xs },

  notesInputContainer: {
    backgroundColor: theme.colors.surfaceContainerLowest, borderWidth: 1,
    borderColor: '#CBD5E1', borderRadius: theme.borders.radius.md, padding: theme.spacing.md, minHeight: 100,
  },
  notesInput: {
    fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurface, minHeight: 80,
  },

  bottomDock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(248,249,255,0.97)', borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingTop: 12, paddingHorizontal: theme.spacing['screen-edge'],
  },
  dockInner: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cancelBtn: {
    height: 48, paddingHorizontal: theme.spacing.xl, borderRadius: theme.borders.radius.md,
    backgroundColor: theme.colors.surfaceContainer, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: theme.typography.weights.semibold, color: theme.colors.onSurfaceVariant },
  saveBtn: {
    flex: 1, height: 48, borderRadius: theme.borders.radius.md,
    backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: theme.typography.weights.semibold, color: theme.colors.onPrimary },
});
