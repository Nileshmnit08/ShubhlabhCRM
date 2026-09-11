import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, TextInput,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Badge from '../components/Badge';
import VoiceInput from '../components/VoiceInput';
import DateTimePickerInput from '../components/DateTimePickerInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../AuthContext';
import {
  Phone, MessageCircle, Users, FileText, CheckCircle2,
  CalendarDays, AlertCircle, Package, Scale,
  ChevronDown, ClipboardList,
} from 'lucide-react-native';

// ─── Authoritative channel and outcome values (from web CRM) ─────────────────

const CHANNELS = [
  { id: 'Call',      label: 'Call',      Icon: Phone },
  { id: 'WhatsApp',  label: 'WhatsApp',  Icon: MessageCircle },
  { id: 'Meeting',   label: 'Meeting',   Icon: Users },
  { id: 'Note',      label: 'Note',      Icon: FileText },
];

const CALL_OUTCOMES = [
  'Contacted', 'No Answer', 'Number Busy', 'Wrong Number',
  'Interested', 'Not Interested', 'Requirement', 'Call Later',
];

const WHATSAPP_OUTCOMES = [
  'Contacted', 'Message Sent', 'Response Received', 'Interested',
  'No Response', 'Requirement', 'Call Later', 'Competitor',
];

const MEETING_NOTE_OUTCOMES = [
  'Completed', 'Interested', 'Requirement', 'Follow-up Required', 'No Show',
];

function getOutcomes(channel) {
  switch (channel) {
    case 'Call':     return CALL_OUTCOMES;
    case 'WhatsApp': return WHATSAPP_OUTCOMES;
    default:         return MEETING_NOTE_OUTCOMES;
  }
}

function channelColor(channel) {
  switch (channel) {
    case 'Call':     return theme.colors.primary;
    case 'WhatsApp': return '#25D366';
    case 'Meeting':  return theme.colors.secondary;
    default:         return theme.colors.onSurfaceVariant;
  }
}

// ─── Channel Selector ─────────────────────────────────────────────────────────
function ChannelSelector({ selected, onSelect }) {
  return (
    <View style={chanStyles.grid}>
      {CHANNELS.map(({ id, label, Icon }) => {
        const isActive = id === selected;
        return (
          <TouchableOpacity
            key={id}
            style={[chanStyles.card, isActive && {
              borderColor: channelColor(id),
              backgroundColor: channelColor(id) + '15',
            }]}
            onPress={() => onSelect(id)}
            activeOpacity={0.75}
          >
            <Icon size={22} color={isActive ? channelColor(id) : theme.colors.onSurfaceVariant} />
            <Text style={[chanStyles.label, isActive && { color: channelColor(id), fontWeight: '700' }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const chanStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    flex: 1, minWidth: '22%', alignItems: 'center',
    paddingVertical: 14, borderRadius: theme.borders.radius.md,
    borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceContainerLow,
    gap: 6,
  },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelSm,
    color: theme.colors.onSurfaceVariant, fontWeight: '600',
  },
});

// ─── Outcome Chips ────────────────────────────────────────────────────────────
function OutcomeChips({ outcomes, selected, onSelect }) {
  return (
    <View style={chipStyles.grid}>
      {outcomes.map(o => {
        const isSelected = o === selected;
        return (
          <TouchableOpacity
            key={o}
            style={[chipStyles.chip, isSelected && chipStyles.chipSelected]}
            onPress={() => onSelect(o)}
            activeOpacity={0.75}
          >
            {isSelected && <CheckCircle2 size={12} color={theme.colors.onSecondary} />}
            <Text style={[chipStyles.text, isSelected && chipStyles.textSelected]}>{o}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: theme.borders.radius.full,
    borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  chipSelected: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  text: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelMd,
    color: theme.colors.onSurfaceVariant, fontWeight: '600',
  },
  textSelected: { color: theme.colors.onSecondary },
});

// ─── Styled Text Input ────────────────────────────────────────────────────────
function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType, maxLength, autoCapitalize }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.onSurfaceVariant}
      multiline={multiline}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={autoCapitalize || 'sentences'}
      maxLength={maxLength}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[inputStyles.input, multiline && inputStyles.multiline, focused && inputStyles.focused]}
    />
  );
}

const inputStyles = StyleSheet.create({
  input: {
    height: 48, backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borders.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurface,
  },
  multiline: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
  focused: { borderWidth: 2, borderColor: theme.colors.secondary },
});

// ─── Section Card ─────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <View style={secStyles.card}>
      <Text style={secStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

const secStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.borders.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.titleSm, fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
});

// ─── Success View ─────────────────────────────────────────────────────────────
function SuccessView({ channel, outcome, partyName, onDone, onViewActivity }) {
  return (
    <View style={sucStyles.container}>
      <View style={sucStyles.iconRing}>
        <CheckCircle2 size={48} color={theme.colors.success} />
      </View>
      <Text style={sucStyles.title}>Activity Logged</Text>
      <Text style={sucStyles.subtitle}>
        <Text style={sucStyles.accent}>{channel}</Text> — {outcome}
        {'\n'}for <Text style={sucStyles.accent}>{partyName}</Text>
      </Text>
      <TouchableOpacity style={sucStyles.primaryBtn} onPress={onViewActivity}>
        <Text style={sucStyles.primaryBtnText}>View Activity</Text>
      </TouchableOpacity>
      <TouchableOpacity style={sucStyles.secondaryBtn} onPress={onDone}>
        <Text style={sucStyles.secondaryBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const sucStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  iconRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: theme.colors.successContainer,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.headlineSm, fontWeight: '700',
    color: theme.colors.onSurface, textAlign: 'center', marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center', lineHeight: 24, marginBottom: theme.spacing.xl,
  },
  accent: { color: theme.colors.secondary, fontWeight: '700' },
  primaryBtn: {
    width: '100%', height: 48, backgroundColor: theme.colors.secondary,
    borderRadius: theme.borders.radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md,
  },
  primaryBtnText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onSecondary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600',
  },
  secondaryBtn: {
    width: '100%', height: 48,
    borderRadius: theme.borders.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onSurface, fontSize: theme.typography.sizes.labelLg, fontWeight: '600',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddActivityScreen({ route, navigation }) {
  const {
    partyId,
    partyName,
    presetChannel,     // optional — set from Call/WhatsApp buttons
    followUpId,        // optional — links to a follow-up
  } = route.params;

  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();

  // ─── Form State ─────────────────────────────────────────────────────────────
  const [channel, setChannel] = useState(presetChannel || 'Call');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');

  // Requirement branching
  const [reqProduct, setReqProduct] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [reqUnit, setReqUnit] = useState('Bags');

  // Call Later / Follow-up branching
  const [fuDate, setFuDate] = useState('');

  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  // Reset outcome when channel changes
  useEffect(() => { setOutcome(''); }, [channel]);

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    if (!outcome) {
      setErrorBanner('Please select an outcome before saving.');
      return false;
    }
    if (outcome === 'Requirement') {
      if (!reqProduct.trim()) {
        setErrorBanner('Please enter a product or feed type for the requirement.');
        return false;
      }
      if (!reqQty || parseFloat(reqQty) <= 0) {
        setErrorBanner('Please enter a valid quantity for the requirement.');
        return false;
      }
    }
    if (outcome === 'Call Later' && !fuDate) {
      setErrorBanner('Please select a follow-up date for "Call Later".');
      return false;
    }
    return true;
  };

  // ─── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setErrorBanner(null);
    if (!validate()) return;
    if (submitting) return;
    setSubmitting(true);

    try {
      // 1. Insert interaction
      const { data: intRow, error: intErr } = await supabase
        .from('interactions')
        .insert({
          party_id: partyId,
          user_id: userProfile?.id || null,
          channel,                       // ← correct column (fixes legacy bug)
          interaction_type: channel,      // ← backward-compat
          direction: 'Outbound',
          purpose: channel,
          outcome,
          note: notes.trim() || null,
          related_follow_up_id: followUpId || null,
        })
        .select('id')
        .single();

      if (intErr) throw intErr;

      // 2. Branching: Requirement outcome → create requirement
      if (outcome === 'Requirement' && reqProduct && reqQty) {
        await supabase.from('requirements').insert({
          party_id: partyId,
          product_type: reqProduct.trim(),
          quantity: parseFloat(reqQty),
          unit: reqUnit,
          priority: 'Normal',
          source_interaction_id: intRow?.id || null,
          assigned_to: userProfile?.id || null,
        });
      }

      // 3. Branching: Call Later → create/update follow-up
      if (outcome === 'Call Later' && fuDate) {
        const { data: existingPending } = await supabase
          .from('follow_ups')
          .select('id')
          .eq('party_id', partyId)
          .eq('status', 'Pending')
          .eq('follow_up_type', 'General')
          .limit(1);

        const fuPayload = {
          reason: `Follow-up from ${channel}${notes ? ': ' + notes.substring(0, 80) : ''}`,
          follow_up_date: fuDate,
          due_at: fuDate,
          priority: 'Normal',
        };

        if (existingPending && existingPending.length > 0) {
          await supabase.from('follow_ups').update(fuPayload).eq('id', existingPending[0].id);
        } else {
          await supabase.from('follow_ups').insert({
            ...fuPayload,
            party_id: partyId,
            follow_up_type: 'General',
            assigned_to: userProfile?.id || null,
          });
        }
      }

      // 4. If linked to a follow-up, mark it completed
      if (followUpId) {
        await supabase.from('follow_ups').update({
          status: 'Completed',
          completed_at: new Date().toISOString(),
          completed_by: userProfile?.id || null,
        }).eq('id', followUpId);
      }

      setSuccess(true);
    } catch (err) {
      console.error('[AddActivity] save error:', err.code, err.message);
      if (err.code === '42501') {
        setErrorBanner('Permission denied. You are not authorized to log this activity.');
      } else if (err.message?.toLowerCase().includes('network')) {
        setErrorBanner('Network error. Please check your connection and try again.');
      } else {
        setErrorBanner('Failed to save activity. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success ─────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Log Activity" showBack={false} />
        <SuccessView
          channel={channel}
          outcome={outcome}
          partyName={partyName}
          onDone={() => navigation.goBack()}
          onViewActivity={() => navigation.replace('ActivityList', { partyId, partyName })}
        />
      </View>
    );
  }

  const showRequirementBranch = outcome === 'Requirement';
  const showFollowUpBranch = outcome === 'Call Later';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Log Activity"
        showBack
        subtitle={partyName}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error Banner */}
          {errorBanner && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={theme.colors.error} />
              <Text style={styles.errorBannerText}>{errorBanner}</Text>
            </View>
          )}

          {/* ── Channel ─────────────────────────────────────── */}
          <Section title="Activity Type">
            <ChannelSelector selected={channel} onSelect={setChannel} />
          </Section>

          {/* ── Outcome ─────────────────────────────────────── */}
          <Section title="Outcome *">
            <OutcomeChips
              outcomes={getOutcomes(channel)}
              selected={outcome}
              onSelect={setOutcome}
            />
          </Section>

          {/* ── Requirement Branch ───────────────────────────── */}
          {showRequirementBranch && (
            <Section title="Capture Requirement">
              <View style={styles.fieldLabel}>
                <Package size={14} color={theme.colors.secondary} />
                <Text style={styles.fieldLabelText}>Product / Feed Type *</Text>
              </View>
              <StyledInput
                value={reqProduct}
                onChangeText={setReqProduct}
                placeholder="e.g. Broiler Finisher, Layer Phase 1"
              />
              <View style={[styles.fieldLabel, { marginTop: theme.spacing.md }]}>
                <Scale size={14} color={theme.colors.secondary} />
                <Text style={styles.fieldLabelText}>Quantity *</Text>
              </View>
              <View style={styles.qtyRow}>
                <View style={{ flex: 1 }}>
                  <StyledInput
                    value={reqQty}
                    onChangeText={setReqQty}
                    placeholder="e.g. 100"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.unitBtns}>
                  {['Bags', 'Tons', 'MT', 'Kg'].map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitBtn, reqUnit === u && styles.unitBtnActive]}
                      onPress={() => setReqUnit(u)}
                    >
                      <Text style={[styles.unitBtnText, reqUnit === u && styles.unitBtnTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Section>
          )}

          {/* ── Call Later Branch ────────────────────────────── */}
          {showFollowUpBranch && (
            <Section title="Schedule Follow-up">
              <DateTimePickerInput
                label="Follow-up Date *"
                value={fuDate}
                onChange={(date) => {
                  const d = new Date(date);
                  if (!isNaN(d.getTime())) {
                    setFuDate(d.toISOString().split('T')[0]);
                  }
                }}
              />
            </Section>
          )}

          {/* ── Notes ───────────────────────────────────────── */}
          <Section title="Notes">
            <VoiceInput
              value={notes}
              onChangeText={setNotes}
              placeholder={`Add notes about this ${channel.toLowerCase()}...`}
            />
          </Section>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Save Dock */}
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator size="small" color={theme.colors.onSecondary} />
            : <Text style={styles.saveBtnText}>Save Activity</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  scroll: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing['screen-edge'],
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: theme.colors.errorContainer,
    borderRadius: theme.borders.radius.md,
    padding: theme.spacing.md, marginBottom: theme.spacing.lg,
  },
  errorBannerText: {
    flex: 1, fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd, color: theme.colors.error, lineHeight: 20,
  },

  fieldLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  fieldLabelText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelMd,
    color: theme.colors.onSurfaceVariant, fontWeight: '600',
  },

  qtyRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  unitBtns: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    alignItems: 'center', paddingTop: 4,
  },
  unitBtn: {
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: theme.borders.radius.sm,
    borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  unitBtnActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  unitBtnText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelSm,
    color: theme.colors.onSurfaceVariant, fontWeight: '600',
  },
  unitBtnTextActive: { color: theme.colors.onSecondary },

  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(248,249,255,0.97)',
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingTop: 12, paddingHorizontal: theme.spacing['screen-edge'],
  },
  saveBtn: {
    height: 48, backgroundColor: theme.colors.secondary,
    borderRadius: theme.borders.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onSecondary,
    fontSize: theme.typography.sizes.labelLg, fontWeight: '600',
  },
});
