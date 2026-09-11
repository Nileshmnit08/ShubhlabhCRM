import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, TextInput,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Badge from '../components/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Truck, CheckCircle2, AlertCircle, XCircle, RotateCcw,
  ChevronDown, Clock, User, Phone, Hash, ClipboardList, Scale,
} from 'lucide-react-native';

// ─── Authoritative Status Transitions ─────────────────────────────────────────
// Based on web CRM Detail.jsx business logic — no invented statuses
const STATUS_TRANSITIONS = {
  'Dispatched':  ['Dispatched', 'Delayed', 'Delivered', 'Cancelled', 'Returned'],
  'Delayed':     ['Delayed', 'Dispatched', 'Delivered', 'Cancelled'],
  'Delivered':   ['Delivered', 'Returned'],
  'Cancelled':   [], // terminal
  'Returned':    [], // terminal
};

function getStatusBadge(status) {
  switch (status) {
    case 'Dispatched': return 'info';
    case 'Delivered':  return 'success';
    case 'Delayed':    return 'warning';
    case 'Cancelled':  return 'error';
    case 'Returned':   return 'default';
    default:           return 'default';
  }
}

// ─── Status Selector Sheet ────────────────────────────────────────────────────
function StatusSheet({ visible, options, selected, onSelect, onClose }) {
  if (!visible) return null;
  return (
    <View style={sheetStyles.overlay}>
      <TouchableOpacity style={sheetStyles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />
        <Text style={sheetStyles.title}>Select Status</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((s) => {
            const isSelected = s === selected;
            return (
              <TouchableOpacity
                key={s}
                style={[sheetStyles.option, isSelected && sheetStyles.optionSelected]}
                onPress={() => { onSelect(s); onClose(); }}
              >
                <Badge label={s} status={getStatusBadge(s)} />
                {isSelected && <CheckCircle2 size={18} color={theme.colors.secondary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,28,48,0.4)' },
  sheet: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderTopLeftRadius: theme.borders.radius.lg,
    borderTopRightRadius: theme.borders.radius.lg,
    padding: theme.spacing.lg, maxHeight: '60%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.outlineVariant,
    alignSelf: 'center', marginBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.titleMd, fontWeight: '700',
    color: theme.colors.onSurface, marginBottom: theme.spacing.md,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borders.radius.md, marginBottom: 6,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  optionSelected: { backgroundColor: theme.colors.primaryContainer },
});

// ─── Field Label + Input Row ───────────────────────────────────────────────────
function FieldRow({ label, icon: Icon, children }) {
  return (
    <View style={fieldStyles.row}>
      <View style={fieldStyles.labelRow}>
        <Icon size={14} color={theme.colors.secondary} />
        <Text style={fieldStyles.label}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  row: { marginBottom: theme.spacing.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelMd,
    color: theme.colors.onSurfaceVariant, fontWeight: '600',
  },
});

// ─── Styled Text Input ─────────────────────────────────────────────────────────
function StyledInput({ value, onChangeText, placeholder, keyboardType, multiline, autoCapitalize, maxLength }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.onSurfaceVariant}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={autoCapitalize || 'sentences'}
      multiline={multiline}
      maxLength={maxLength}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        inputStyles.input,
        multiline && inputStyles.multiline,
        focused && inputStyles.focused,
      ]}
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
  multiline: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  focused: { borderWidth: 2, borderColor: theme.colors.secondary },
});

// ─── Selector Row (Status Trigger) ────────────────────────────────────────────
function SelectorRow({ label, value, onPress }) {
  return (
    <TouchableOpacity style={selStyles.row} onPress={onPress} activeOpacity={0.7}>
      <Badge label={value} status={getStatusBadge(value)} />
      <ChevronDown size={18} color={theme.colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

const selStyles = StyleSheet.create({
  row: {
    height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borders.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
  },
});

// ─── Success View ─────────────────────────────────────────────────────────────
function SuccessView({ dispatch, onViewDispatch }) {
  return (
    <View style={sucStyles.container}>
      <View style={sucStyles.iconCircle}>
        <CheckCircle2 size={48} color={theme.colors.success} />
      </View>
      <Text style={sucStyles.title}>Dispatch Updated</Text>
      <Text style={sucStyles.subtitle}>
        Status changed to <Text style={sucStyles.statusText}>{dispatch?.status}</Text>.
        Changes are live in the CRM.
      </Text>
      <TouchableOpacity style={sucStyles.btn} onPress={onViewDispatch}>
        <Text style={sucStyles.btnText}>View Dispatch</Text>
      </TouchableOpacity>
    </View>
  );
}

const sucStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.successContainer,
    alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.headlineSm, fontWeight: '700',
    color: theme.colors.onSurface, textAlign: 'center', marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant,
    textAlign: 'center', marginBottom: theme.spacing.xl, lineHeight: 22,
  },
  statusText: { color: theme.colors.secondary, fontWeight: '700' },
  btn: {
    height: 48, backgroundColor: theme.colors.secondary, borderRadius: theme.borders.radius.md,
    paddingHorizontal: theme.spacing.xl, alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  btnText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onSecondary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600',
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function UpdateDispatchScreen({ route, navigation }) {
  const { dispatchId, currentStatus, currentQuantity } = route.params;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  // Current dispatch for reference
  const [dispatchRecord, setDispatchRecord] = useState(null);

  // Form state — fields editable in field operations
  const [status, setStatus] = useState(currentStatus || 'Dispatched');
  const [truckNumber, setTruckNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [lrBilty, setLrBilty] = useState('');
  const [remarks, setRemarks] = useState('');

  // Delivery-specific fields
  const [actualDeliveryDate, setActualDeliveryDate] = useState('');
  const [shortageQty, setShortageQty] = useState('');

  // Cancellation / Return fields
  const [cancellationReason, setCancellationReason] = useState('');
  const [returnQty, setReturnQty] = useState('');

  useEffect(() => {
    fetchDispatch();
  }, [dispatchId]);

  const fetchDispatch = async () => {
    try {
      const { data, error } = await supabase
        .from('requirement_dispatches')
        .select('*')
        .eq('id', dispatchId)
        .single();

      if (error) throw error;

      setDispatchRecord(data);
      setStatus(data.status || 'Dispatched');
      setTruckNumber(data.truck_number || '');
      setDriverName(data.driver_name || '');
      setDriverMobile(data.driver_mobile || '');
      setTransporterName(data.transporter_name || '');
      setLrBilty(data.lr_bilty_number || '');
      setRemarks(data.remarks || '');
      setActualDeliveryDate(data.actual_delivery_date || '');
      setShortageQty(data.shortage_quantity > 0 ? String(data.shortage_quantity) : '');
      setCancellationReason(data.cancellation_reason || '');
      setReturnQty(data.return_quantity > 0 ? String(data.return_quantity) : '');
    } catch (err) {
      console.error('[UpdateDispatch] fetch error:', err);
      setErrorBanner('Failed to load dispatch details. Please go back and try again.');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    if (!truckNumber.trim()) {
      setErrorBanner('Vehicle number is required.');
      return false;
    }
    if (driverMobile && !/^[0-9]{10}$/.test(driverMobile.trim())) {
      setErrorBanner('Driver mobile must be exactly 10 digits.');
      return false;
    }
    if (status === 'Delivered') {
      if (actualDeliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(actualDeliveryDate)) {
        setErrorBanner('Delivery date must be in YYYY-MM-DD format.');
        return false;
      }
    }
    if (status === 'Cancelled' && !cancellationReason.trim()) {
      setErrorBanner('A reason is required when cancelling a dispatch.');
      return false;
    }
    if (status === 'Returned') {
      const qty = parseFloat(returnQty);
      if (!returnQty || isNaN(qty) || qty <= 0) {
        setErrorBanner('Return quantity must be greater than zero.');
        return false;
      }
      const maxQty = dispatchRecord?.quantity || currentQuantity || Infinity;
      if (qty > maxQty) {
        setErrorBanner(`Return quantity (${qty}) cannot exceed dispatched quantity (${maxQty}).`);
        return false;
      }
      if (!cancellationReason.trim()) {
        setErrorBanner('A reason is required for returning goods.');
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    setErrorBanner(null);
    if (!validate()) return;
    if (submitting) return; // anti-double-submit
    setSubmitting(true);

    try {
      const updates = {
        status,
        truck_number: truckNumber.trim().toUpperCase(),
        driver_name: driverName.trim() || null,
        driver_mobile: driverMobile.trim() || null,
        transporter_name: transporterName.trim() || null,
        lr_bilty_number: lrBilty.trim() || null,
        remarks: remarks.trim() || null,
      };

      // Status-specific fields
      if (status === 'Delivered') {
        if (actualDeliveryDate) updates.actual_delivery_date = actualDeliveryDate;
        if (shortageQty) updates.shortage_quantity = parseFloat(shortageQty) || 0;
      }

      if (status === 'Cancelled') {
        updates.cancellation_reason = cancellationReason.trim();
      }

      if (status === 'Returned') {
        updates.return_quantity = parseFloat(returnQty);
        updates.cancellation_reason = cancellationReason.trim();
        // Full return marks as Returned; partial marks as Delivered (web CRM pattern)
        const maxQty = dispatchRecord?.quantity || currentQuantity;
        if (parseFloat(returnQty) === maxQty) {
          updates.status = 'Returned';
        } else {
          updates.status = 'Delivered';
        }
      }

      const { error } = await supabase
        .from('requirement_dispatches')
        .update(updates)
        .eq('id', dispatchId);

      if (error) {
        if (error.code === '42501') {
          setErrorBanner('Permission denied. You are not authorized to update this dispatch.');
        } else if (error.message?.toLowerCase().includes('network')) {
          setErrorBanner('Network error. Please check your connection and try again.');
        } else {
          setErrorBanner('Failed to save changes. Please try again.');
        }
        console.error('[UpdateDispatch] update error:', error.code, error.message);
        return;
      }

      // Refresh the local record to show correct values in SuccessView
      await fetchDispatch();
      setSuccess(true);

    } catch (err) {
      console.error('[UpdateDispatch] unexpected error:', err);
      setErrorBanner('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDispatch = () => {
    navigation.replace('DispatchDetail', { dispatchId });
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Update Dispatch" showBack={true} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
        </View>
      </View>
    );
  }

  // ─── Terminal State ──────────────────────────────────────────────────────────
  const isTerminal = dispatchRecord?.status === 'Cancelled' || dispatchRecord?.status === 'Returned';
  if (isTerminal) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Update Dispatch" showBack={true} />
        <View style={styles.center}>
          <View style={styles.lockedBox}>
            <XCircle size={40} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.lockedTitle}>No Updates Allowed</Text>
            <Text style={styles.lockedText}>
              This dispatch is <Text style={{ fontWeight: '700' }}>{dispatchRecord.status}</Text>.{'\n'}
              No further updates can be made.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ─── Success ─────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Update Dispatch" showBack={false} />
        <SuccessView dispatch={dispatchRecord} onViewDispatch={handleViewDispatch} />
      </View>
    );
  }

  const availableStatuses = STATUS_TRANSITIONS[dispatchRecord?.status || 'Dispatched'] || [];

  return (
    <View style={styles.container}>
      <StatusSheet
        visible={showStatusSheet}
        options={availableStatuses}
        selected={status}
        onSelect={setStatus}
        onClose={() => setShowStatusSheet(false)}
      />

      <ScreenHeader
        title="Update Dispatch"
        showBack={true}
        subtitle={`DSP-${dispatchId.substring(0, 8).toUpperCase()}`}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current snapshot */}
          <View style={styles.snapshotCard}>
            <Text style={styles.snapshotTitle}>Current Dispatch</Text>
            <View style={styles.snapshotRow}>
              <Badge label={dispatchRecord?.status} status={getStatusBadge(dispatchRecord?.status)} />
              <Text style={styles.snapshotInfo}>
                {dispatchRecord?.quantity} {dispatchRecord?.unit}
                {dispatchRecord?.truck_number ? ` · ${dispatchRecord.truck_number}` : ''}
              </Text>
            </View>
          </View>

          {/* Error Banner */}
          {errorBanner && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={theme.colors.error} />
              <Text style={styles.errorBannerText}>{errorBanner}</Text>
            </View>
          )}

          {/* ── Section: Status ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dispatch Status</Text>
            <FieldRow label="Status" icon={CheckCircle2}>
              <SelectorRow
                value={status}
                onPress={() => setShowStatusSheet(true)}
              />
            </FieldRow>
          </View>

          {/* ── Section: Logistics ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Logistics</Text>
            <FieldRow label="Vehicle Number *" icon={Truck}>
              <StyledInput
                value={truckNumber}
                onChangeText={setTruckNumber}
                placeholder="e.g. MH 12 AB 1234"
                autoCapitalize="characters"
                maxLength={20}
              />
            </FieldRow>
            <FieldRow label="Transporter Name" icon={Truck}>
              <StyledInput
                value={transporterName}
                onChangeText={setTransporterName}
                placeholder="Transporter / Agency name"
              />
            </FieldRow>
            <FieldRow label="Driver Name" icon={User}>
              <StyledInput
                value={driverName}
                onChangeText={setDriverName}
                placeholder="Driver full name"
              />
            </FieldRow>
            <FieldRow label="Driver Mobile" icon={Phone}>
              <StyledInput
                value={driverMobile}
                onChangeText={setDriverMobile}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </FieldRow>
          </View>

          {/* ── Section: Documentation ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documentation</Text>
            <FieldRow label="LR / Bilty Number" icon={Hash}>
              <StyledInput
                value={lrBilty}
                onChangeText={setLrBilty}
                placeholder="LR number / bilty"
                autoCapitalize="characters"
              />
            </FieldRow>
          </View>

          {/* ── Section: Delivery Details (shown only for Delivered) ─── */}
          {status === 'Delivered' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Confirmation</Text>
              <FieldRow label="Actual Delivery Date" icon={Clock}>
                <StyledInput
                  value={actualDeliveryDate}
                  onChangeText={setActualDeliveryDate}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </FieldRow>
              <FieldRow label="Shortage Quantity (if any)" icon={Scale}>
                <StyledInput
                  value={shortageQty}
                  onChangeText={setShortageQty}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </FieldRow>
            </View>
          )}

          {/* ── Section: Return / Cancellation ─── */}
          {(status === 'Cancelled' || status === 'Returned') && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
                {status === 'Returned' ? 'Return Details' : 'Cancellation Details'}
              </Text>
              {status === 'Returned' && (
                <FieldRow label="Return Quantity *" icon={Scale}>
                  <StyledInput
                    value={returnQty}
                    onChangeText={setReturnQty}
                    placeholder={`Max: ${dispatchRecord?.quantity || currentQuantity}`}
                    keyboardType="decimal-pad"
                  />
                </FieldRow>
              )}
              <FieldRow label="Reason *" icon={AlertCircle}>
                <StyledInput
                  value={cancellationReason}
                  onChangeText={setCancellationReason}
                  placeholder="Required — describe the reason"
                  multiline
                />
              </FieldRow>
            </View>
          )}

          {/* ── Section: Remarks ─── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Remarks</Text>
            <FieldRow label="Additional Notes" icon={ClipboardList}>
              <StyledInput
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Any additional notes on this dispatch..."
                multiline
              />
            </FieldRow>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Sticky Save Dock ─────────────────────────────────────────────── */}
      <View style={[styles.saveDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator size="small" color={theme.colors.onSecondary} />
            : <Text style={styles.saveBtnText}>Save Changes</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },

  lockedBox: { alignItems: 'center', padding: theme.spacing.xl },
  lockedTitle: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.titleMd, fontWeight: '700',
    color: theme.colors.onSurface, marginTop: theme.spacing.md,
  },
  lockedText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant,
    textAlign: 'center', marginTop: theme.spacing.sm, lineHeight: 22,
  },

  scrollContent: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing['screen-edge'],
  },

  snapshotCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.borders.radius.lg, padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg, ...theme.shadows.sm,
  },
  snapshotTitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSurfaceVariant,
    fontWeight: '600', marginBottom: theme.spacing.sm,
  },
  snapshotRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  snapshotInfo: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface,
    fontWeight: '600', fontFamily: 'monospace',
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

  section: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.borders.radius.lg, padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg, ...theme.shadows.sm,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.titleSm, fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },

  saveDock: {
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
    color: theme.colors.onSecondary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600',
  },
});
