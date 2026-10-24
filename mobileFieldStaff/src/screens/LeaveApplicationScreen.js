import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { AttendanceService } from '../services/AttendanceService';
import { AttendanceMessage } from '../components/AttendanceCard';
import {
  LEAVE_TYPES,
  LEAVE_REASON_MAX,
  istBusinessDate,
  addDaysYmd,
  formatYmd,
  daysInclusive,
  validateLeaveInput,
} from '../utils/attendance';

// Dependency-free date selector (no date picker library is installed in this app).
function DateStepper({ label, value, onChange, min, error }) {
  const canGoBack = !min || value > min;
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.stepper, error && styles.inputError]}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => canGoBack && onChange(addDaysYmd(value, -1))}
          disabled={!canGoBack}
          accessibilityLabel={`${label}: previous day`}
        >
          <MaterialIcons name="chevron-left" size={28} color={canGoBack ? colors.primary : colors.outlineVariant} />
        </TouchableOpacity>
        <Text style={styles.stepValue} accessibilityLiveRegion="polite">{formatYmd(value)}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(addDaysYmd(value, 1))} accessibilityLabel={`${label}: next day`}>
          <MaterialIcons name="chevron-right" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function LeaveApplicationScreen({ navigation }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const today = istBusinessDate();

  const [leaveType, setLeaveType] = useState(null);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const busyRef = useRef(false);

  const days = daysInclusive(startDate, endDate);

  const onStartChange = (ymd) => {
    setStartDate(ymd);
    if (endDate < ymd) setEndDate(ymd); // keep single-day by default
  };

  const handleSubmit = async () => {
    if (busyRef.current || submitted || !userId) return;
    const form = { leaveType, startDate, endDate, reason };
    const local = validateLeaveInput(form);
    if (!local.valid) {
      setErrors(local.errors);
      setMessage({ type: 'error', text: 'Please correct the highlighted fields.' });
      return;
    }

    busyRef.current = true;
    setSubmitting(true);
    setErrors({});
    setMessage(null);
    try {
      const result = await AttendanceService.applyLeave(userId, form);
      if (result.state === 'SYNCED') {
        setSubmitted(true);
        setMessage({ type: 'success', text: 'Leave request submitted. Status: Pending approval.' });
      } else if (result.state === 'FAILED') {
        setMessage({ type: 'error', text: `Leave request was not accepted by the server. ${result.error || ''}`.trim() });
      } else {
        setSubmitted(true);
        setMessage({ type: 'info', text: 'Saved on this device. It will be submitted when the connection allows. It is not yet pending approval.' });
      }
    } catch (e) {
      if (e?.fieldErrors) setErrors(e.fieldErrors);
      setMessage({ type: 'error', text: e?.message || 'Could not submit the leave request.' });
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply for Leave</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, elevation.level1]}>
            <Text style={styles.fieldLabel}>Leave type</Text>
            <View style={styles.chipRow}>
              {LEAVE_TYPES.map((t) => {
                const selected = leaveType === t.code;
                return (
                  <TouchableOpacity
                    key={t.code}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setLeaveType(t.code)}
                    disabled={submitted}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.leaveType ? <Text style={styles.errorText}>{errors.leaveType}</Text> : null}

            <DateStepper label="Start date" value={startDate} onChange={onStartChange} error={errors.startDate} />
            <DateStepper label="End date" value={endDate} onChange={setEndDate} min={startDate} error={errors.endDate} />
            {days ? <Text style={styles.daysText}>{days} day{days > 1 ? 's' : ''}</Text> : null}

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Reason</Text>
              <TextInput
                style={[styles.textArea, errors.reason && styles.inputError]}
                value={reason}
                onChangeText={setReason}
                placeholder="Briefly describe the reason for leave"
                placeholderTextColor={colors.outline}
                multiline
                maxLength={LEAVE_REASON_MAX}
                editable={!submitted}
                textAlignVertical="top"
              />
              <Text style={styles.counter}>{reason.trim().length}/{LEAVE_REASON_MAX}</Text>
              {errors.reason ? <Text style={styles.errorText}>{errors.reason}</Text> : null}
            </View>

            <AttendanceMessage message={message} />

            {submitted ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.secondaryBtnText}>Back to Leave Requests</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityState={{ disabled: submitting, busy: submitting }}
              >
                {submitting
                  ? <ActivityIndicator size="small" color={colors.onPrimary} />
                  : <Text style={styles.primaryBtnText}>SUBMIT</Text>}
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.footNote}>Leave is approved by your administrator. You cannot approve your own request.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4, backgroundColor: colors.surfaceContainerLowest, elevation: 2 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  container: { padding: 16, paddingBottom: 48 },
  card: { backgroundColor: colors.surface, borderRadius: rounded.lg, padding: 16 },
  fieldBlock: { marginTop: 16 },
  fieldLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: rounded.full, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.labelMd, color: colors.onSurface },
  chipTextSelected: { color: colors.onPrimary },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: rounded.default, backgroundColor: colors.surfaceContainerLowest },
  stepBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  stepValue: { ...typography.bodyLg, color: colors.onSurface, flex: 1, textAlign: 'center' },
  daysText: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 6 },
  textArea: { minHeight: 100, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: rounded.default, padding: 12, ...typography.bodyLg, color: colors.onSurface, backgroundColor: colors.surfaceContainerLowest },
  counter: { ...typography.bodySm, color: colors.outline, textAlign: 'right', marginTop: 4 },
  inputError: { borderColor: colors.error },
  errorText: { ...typography.bodySm, color: colors.error, marginTop: 4 },
  primaryBtn: { marginTop: 20, minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: rounded.md },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: 'bold' },
  secondaryBtn: { marginTop: 20, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: rounded.md, borderWidth: 1, borderColor: colors.outlineVariant },
  secondaryBtnText: { ...typography.labelLg, color: colors.secondary },
  footNote: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' },
});
