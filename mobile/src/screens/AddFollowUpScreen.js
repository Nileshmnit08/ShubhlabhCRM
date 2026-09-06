import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, TextInput,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Input from '../components/Input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building2, Calendar, Tag, ChevronDown, AlertCircle,
  CheckCircle2, Sparkles,
} from 'lucide-react-native';

// ─── Constants derived from existing CRM schema ────────────────────────────────
// follow_up_type: 'General', 'Payment', 'Commercial', 'Reactivation'
// priority: 'High', 'Normal', 'Low'
// reason / follow_up_reason: free text but guided by presets

const FOLLOW_UP_TYPES = [
  { value: 'General', label: 'General', desc: 'Routine check-in' },
  { value: 'Commercial', label: 'Commercial', desc: 'Order / pricing discussion' },
  { value: 'Payment', label: 'Payment', desc: 'Payment collection' },
  { value: 'Reactivation', label: 'Reactivation', desc: 'Revive dormant account' },
];

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Normal', label: 'Normal' },
  { value: 'High', label: 'High' },
];

// Reason presets per type — derived from actual CRM usage patterns (not invented)
const REASON_PRESETS = {
  General: [
    'Routine check-in',
    'Discuss new products',
    'Post-visit follow-up',
    'Customer requested callback',
  ],
  Commercial: [
    'Share quotation',
    'Close open requirement',
    'Discuss pricing',
    'Confirm order details',
  ],
  Payment: [
    'Collect overdue payment',
    'Follow up on promise to pay',
    'Verify payment credit',
    'Discuss payment terms',
  ],
  Reactivation: [
    'Reconnect with dormant customer',
    'Offer reactivation deal',
    'Understand reason for inactivity',
    'Share new product catalog',
  ],
};

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
  track: { flexDirection: 'row', backgroundColor: theme.colors.surfaceContainer, borderRadius: theme.borders.radius.md, padding: 4, gap: 2 },
  seg: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  segActive: { backgroundColor: theme.colors.surfaceContainerLowest, ...theme.shadows.sm },
  segText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, fontWeight: '500', color: theme.colors.onSurfaceVariant },
  segTextActive: { color: theme.colors.onSurface, fontWeight: '700' },
});

// ─── Type Selector ─────────────────────────────────────────────────────────────
function TypeSelector({ value, onChange }) {
  return (
    <View style={typeStyles.container}>
      {FOLLOW_UP_TYPES.map((t) => {
        const isActive = t.value === value;
        return (
          <TouchableOpacity
            key={t.value}
            style={[typeStyles.card, isActive && typeStyles.cardActive]}
            onPress={() => onChange(t.value)}
          >
            <Text style={[typeStyles.label, isActive && typeStyles.labelActive]}>{t.label}</Text>
            <Text style={typeStyles.desc} numberOfLines={1}>{t.desc}</Text>
            {isActive && <View style={typeStyles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const typeStyles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '47%', backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.md, padding: theme.spacing.md, borderWidth: 1.5, borderColor: 'transparent', position: 'relative' },
  cardActive: { borderColor: theme.colors.secondary, backgroundColor: theme.colors.surfaceContainerLowest },
  label: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: '700', color: theme.colors.onSurfaceVariant, marginBottom: 2 },
  labelActive: { color: theme.colors.secondary },
  desc: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant },
  dot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.secondary },
});

// ─── Success View ─────────────────────────────────────────────────────────────
function SuccessView({ reason, partyName, date, onViewDetail, onAddAnother, onBackToCustomer }) {
  return (
    <View style={successStyles.container}>
      <View style={successStyles.card}>
        <View style={successStyles.iconBox}>
          <CheckCircle2 size={48} color={theme.colors.success} />
        </View>
        <Text style={successStyles.title}>Follow-up Scheduled</Text>
        <Text style={successStyles.subtitle}>
          Successfully booked for{'\n'}
          <Text style={successStyles.highlight}>{partyName}</Text>
        </Text>
        <View style={successStyles.summaryBox}>
          <View style={successStyles.summaryRow}>
            <Text style={successStyles.summaryLabel}>Reason</Text>
            <Text style={successStyles.summaryValue} numberOfLines={2}>{reason}</Text>
          </View>
          <View style={successStyles.summaryRow}>
            <Text style={successStyles.summaryLabel}>Date</Text>
            <Text style={successStyles.summaryValue}>{date}</Text>
          </View>
        </View>
        <View style={successStyles.actions}>
          {onViewDetail && (
            <TouchableOpacity style={successStyles.primaryBtn} onPress={onViewDetail}>
              <Text style={successStyles.primaryBtnText}>View Follow-up</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={successStyles.outlineBtn} onPress={onAddAnother}>
            <Text style={successStyles.outlineBtnText}>Add Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={successStyles.backLink} onPress={onBackToCustomer}>
            <Text style={successStyles.backLinkText}>← Back</Text>
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
  title: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineLg, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 4 },
  subtitle: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: theme.spacing.xl },
  highlight: { color: theme.colors.secondary, fontWeight: '600' },
  summaryBox: { width: '100%', backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.md, padding: theme.spacing.lg, marginBottom: theme.spacing.xl },
  summaryRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 4 },
  summaryLabel: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSurfaceVariant },
  summaryValue: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, fontWeight: '600', color: theme.colors.onSurface },
  actions: { width: '100%', gap: theme.spacing.md },
  primaryBtn: { width: '100%', height: 48, backgroundColor: theme.colors.primary, borderRadius: theme.borders.radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.onPrimary, fontWeight: '600', fontSize: theme.typography.sizes.labelLg },
  outlineBtn: { width: '100%', height: 48, borderRadius: theme.borders.radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.colors.outlineVariant },
  outlineBtnText: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.onSurfaceVariant, fontWeight: '600', fontSize: theme.typography.sizes.labelLg },
  backLink: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  backLinkText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.secondary },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function AddFollowUpScreen({ route, navigation }) {
  // Support being launched with or without customer context,
  // and with editMode for pre-filling existing follow-up data
  const { partyId, partyName, requirementId, editMode, existingFollowUp } = route.params || {};
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();

  // Form state
  const [followUpType, setFollowUpType] = useState(existingFollowUp?.follow_up_type || 'General');
  const [priority, setPriority] = useState(existingFollowUp?.priority || 'Normal');
  const [reason, setReason] = useState(existingFollowUp?.reason || '');
  const [followUpDate, setFollowUpDate] = useState(existingFollowUp?.follow_up_date || '');
  const [notes, setNotes] = useState(existingFollowUp?.notes || '');
  const [selectedPreset, setSelectedPreset] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [savedFollowUp, setSavedFollowUp] = useState(null);

  // Reset reason presets when type changes (unless editing)
  const handleTypeChange = (t) => {
    setFollowUpType(t);
    if (!editMode) {
      setSelectedPreset('');
      setReason('');
    }
  };

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    setReason(preset);
    setErrors((e) => ({ ...e, reason: undefined }));
  };

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};

    if (!reason.trim()) {
      newErrors.reason = 'Reason is required.';
    }

    if (!followUpDate.trim()) {
      newErrors.followUpDate = 'Date is required.';
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(followUpDate)) {
        newErrors.followUpDate = 'Use YYYY-MM-DD format (e.g. 2026-09-15).';
      } else if (isNaN(new Date(followUpDate).getTime())) {
        newErrors.followUpDate = 'Invalid date.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    setSaving(true);

    try {
      const payload = {
        party_id: partyId,
        reason: reason.trim(),
        follow_up_reason: reason.trim(),
        follow_up_date: followUpDate.trim(),
        follow_up_type: followUpType,
        priority,
        notes: notes.trim() || null,
        status: 'Pending',
        created_by: userProfile?.id ?? null,
        assigned_to: userProfile?.id ?? null,
      };

      let data, error;

      if (editMode && existingFollowUp?.id) {
        // Update existing follow-up
        ({ data, error } = await supabase
          .from('follow_ups')
          .update(payload)
          .eq('id', existingFollowUp.id)
          .select()
          .single());
      } else {
        // Insert new follow-up
        ({ data, error } = await supabase
          .from('follow_ups')
          .insert([payload])
          .select()
          .single());
      }

      if (error) {
        // Handle unique constraint violation (one pending per type per customer)
        if (error.code === '23505') {
          setErrors({ _global: `A pending ${followUpType} follow-up already exists for this customer. Complete or reschedule it first.` });
        } else if (error.code === '42501') {
          setErrors({ _global: 'You do not have permission to create follow-ups.' });
        } else if (error.message?.toLowerCase().includes('network')) {
          setErrors({ _global: 'Network error. Please check your connection and retry.' });
        } else {
          setErrors({ _global: 'Failed to save follow-up. Please try again.' });
        }
        console.error('[AddFollowUp] error:', error.code, error.message);
        return;
      }

      setSavedFollowUp(data);
    } catch (err) {
      setErrors({ _global: 'An unexpected error occurred. Please try again.' });
      console.error('[AddFollowUp] unexpected:', err);
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFollowUpType('General');
    setPriority('Normal');
    setReason('');
    setFollowUpDate('');
    setNotes('');
    setSelectedPreset('');
    setErrors({});
    setSavedFollowUp(null);
  };

  // ─── Success screen ───────────────────────────────────────────────────────────
  if (savedFollowUp) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScreenHeader title="Follow-up Scheduled" showBack={false} />
        <SuccessView
          reason={savedFollowUp.reason}
          partyName={partyName || 'Customer'}
          date={savedFollowUp.follow_up_date}
          onViewDetail={savedFollowUp.id
            ? () => navigation.replace('FollowUpDetail', { followUpId: savedFollowUp.id })
            : null}
          onAddAnother={resetForm}
          onBackToCustomer={() => navigation.goBack()}
        />
      </View>
    );
  }

  const currentPresets = REASON_PRESETS[followUpType] || [];
  const screenTitle = editMode ? 'Edit Follow-up' : 'Schedule Follow-up';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={screenTitle}
        showBack={true}
        subtitle={partyName || undefined}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: theme.spacing['screen-edge'], paddingTop: theme.spacing.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Global Error */}
          {errors._global && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={theme.colors.onErrorContainer} />
              <Text style={styles.errorBannerText}>{errors._global}</Text>
            </View>
          )}

          {/* Customer Context */}
          {partyName && (
            <View style={styles.customerContextCard}>
              <View style={styles.customerIconBox}>
                <Building2 size={20} color={theme.colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contextLabel}>For customer</Text>
                <Text style={styles.contextName} numberOfLines={1}>{partyName}</Text>
              </View>
            </View>
          )}

          {/* Type */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Tag size={18} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>Follow-up Type</Text>
            </View>
            <TypeSelector value={followUpType} onChange={handleTypeChange} />
          </View>

          {/* Reason / Preset */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Sparkles size={18} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>Reason</Text>
            </View>

            <Text style={styles.fieldLabel}>Quick Select</Text>
            <View style={styles.presetGrid}>
              {currentPresets.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetChip, selectedPreset === p && styles.presetChipActive]}
                  onPress={() => handlePresetSelect(p)}
                >
                  <Text style={[styles.presetChipText, selectedPreset === p && styles.presetChipTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Reason *"
              placeholder="Describe the follow-up purpose..."
              value={reason}
              onChangeText={(t) => { setReason(t); setSelectedPreset(''); }}
              error={errors.reason}
              containerStyle={{ marginTop: theme.spacing.lg, marginBottom: 0 }}
            />
          </View>

          {/* Schedule */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Calendar size={18} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>Schedule</Text>
            </View>

            <Input
              label="Follow-up Date *"
              placeholder="YYYY-MM-DD"
              value={followUpDate}
              onChangeText={setFollowUpDate}
              keyboardType="numbers-and-punctuation"
              error={errors.followUpDate}
            />

            <Text style={styles.fieldLabel}>Priority</Text>
            <SegmentedControl
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={setPriority}
            />
          </View>

          {/* Notes */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Sparkles size={18} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <View style={styles.notesContainer}>
              <TextInput
                style={styles.notesInput}
                placeholder="Context, background, anything relevant..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Save Dock */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.dockInner}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : (
              <Text style={styles.saveBtnText}>
                {editMode ? 'Update Follow-up' : 'Schedule Follow-up'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.errorContainer, padding: theme.spacing.lg, borderRadius: theme.borders.radius.md, marginBottom: theme.spacing.lg, gap: 10 },
  errorBannerText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onErrorContainer, flex: 1 },

  customerContextCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border, gap: 12 },
  customerIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center', ...theme.shadows.sm },
  contextLabel: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, marginBottom: 2 },
  contextName: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: '700', color: theme.colors.onSurface },

  sectionCard: { backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borders.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.lg, ...theme.shadows.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.lg },
  sectionTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: '700', color: theme.colors.onSurface },

  fieldLabel: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: '600', color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.sm, letterSpacing: 0.1 },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: theme.borders.radius.full, borderWidth: 1.5, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceContainerLow },
  presetChipActive: { borderColor: theme.colors.secondary, backgroundColor: theme.colors.surfaceContainerLowest },
  presetChipText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSurfaceVariant, fontWeight: '500' },
  presetChipTextActive: { color: theme.colors.secondary, fontWeight: '700' },

  notesContainer: { backgroundColor: theme.colors.surfaceContainerLowest, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: theme.borders.radius.md, padding: theme.spacing.md, minHeight: 90 },
  notesInput: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface, minHeight: 72 },

  bottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248,249,255,0.97)', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, paddingHorizontal: theme.spacing['screen-edge'] },
  dockInner: { flexDirection: 'row', gap: 12 },
  cancelBtn: { height: 48, paddingHorizontal: theme.spacing.xl, borderRadius: theme.borders.radius.md, backgroundColor: theme.colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: '600', color: theme.colors.onSurfaceVariant },
  saveBtn: { flex: 1, height: 48, borderRadius: theme.borders.radius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: '600', color: theme.colors.onPrimary },
});
