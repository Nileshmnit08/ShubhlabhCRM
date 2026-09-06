import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building2, Calendar, Clock, User, ClipboardList, Tag,
  CheckCircle2, RefreshCw, AlertCircle, PenLine, CalendarPlus,
  Package, Sparkles, ChevronRight,
} from 'lucide-react-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDatetime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status) {
  switch (status) {
    case 'Completed': return 'success';
    case 'Postponed': return 'info';
    case 'Cancelled': return 'error';
    default: return 'warning';
  }
}

function getPriorityBadge(p) {
  switch (p) {
    case 'High': return 'warning';
    case 'Low': return 'default';
    default: return 'info';
  }
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, valueStyle }) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconBox}><Icon size={16} color={theme.colors.secondary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={[infoStyles.value, valueStyle]}>{value || '—'}</Text>
      </View>
    </View>
  );
}
const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  label: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  value: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface, fontWeight: '500' },
});

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, children }) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <Icon size={18} color={theme.colors.secondary} />
        <Text style={cardStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const cardStyles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borders.radius.lg, marginHorizontal: theme.spacing['screen-edge'], marginBottom: theme.spacing.lg, padding: theme.spacing.lg, ...theme.shadows.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: '700', color: theme.colors.onSurface },
});

// ─── Complete Sheet (inline) ───────────────────────────────────────────────────
function CompleteSheet({ visible, onClose, onConfirm, saving }) {
  const [notes, setNotes] = useState('');
  if (!visible) return null;
  return (
    <View style={sheetStyles.overlay}>
      <TouchableOpacity style={sheetStyles.backdrop} onPress={onClose} activeOpacity={1} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={sheetStyles.sheetWrap}>
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.sheetTitle}>Complete Follow-up</Text>
          <Text style={sheetStyles.sheetSub}>Record the outcome of this follow-up.</Text>
          <Text style={sheetStyles.inputLabel}>Outcome / Notes *</Text>
          <View style={sheetStyles.inputBox}>
            <TextInput
              style={sheetStyles.input}
              placeholder="What happened? Any next action to plan?"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              multiline
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
              autoFocus
            />
          </View>
          <View style={sheetStyles.actions}>
            <TouchableOpacity style={sheetStyles.cancelBtn} onPress={onClose}>
              <Text style={sheetStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sheetStyles.confirmBtn, saving && { opacity: 0.6 }]}
              onPress={() => onConfirm(notes)}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color={theme.colors.onPrimary} /> : (
                <Text style={sheetStyles.confirmText}>Mark Completed</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Reschedule Sheet (inline) ────────────────────────────────────────────────
function RescheduleSheet({ visible, onClose, onConfirm, saving }) {
  const [newDate, setNewDate] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  if (!visible) return null;
  return (
    <View style={sheetStyles.overlay}>
      <TouchableOpacity style={sheetStyles.backdrop} onPress={onClose} activeOpacity={1} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={sheetStyles.sheetWrap}>
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.sheetTitle}>Reschedule Follow-up</Text>
          <Text style={sheetStyles.sheetSub}>The original date will be preserved for audit.</Text>
          <Text style={sheetStyles.inputLabel}>New Date (YYYY-MM-DD) *</Text>
          <View style={[sheetStyles.inputBox, { minHeight: 48, justifyContent: 'center' }]}>
            <TextInput
              style={[sheetStyles.input, { minHeight: 48 }]}
              placeholder="e.g. 2026-09-20"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={newDate}
              onChangeText={setNewDate}
              keyboardType="numbers-and-punctuation"
              autoFocus
            />
          </View>
          <Text style={sheetStyles.inputLabel}>Reason for reschedule</Text>
          <View style={sheetStyles.inputBox}>
            <TextInput
              style={sheetStyles.input}
              placeholder="Optional: Customer requested, was out of office..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              multiline
              value={rescheduleNote}
              onChangeText={setRescheduleNote}
              textAlignVertical="top"
            />
          </View>
          <View style={sheetStyles.actions}>
            <TouchableOpacity style={sheetStyles.cancelBtn} onPress={onClose}>
              <Text style={sheetStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sheetStyles.confirmBtn, saving && { opacity: 0.6 }]}
              onPress={() => onConfirm(newDate, rescheduleNote)}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color={theme.colors.onPrimary} /> : (
                <Text style={sheetStyles.confirmText}>Reschedule</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,28,48,0.4)' },
  sheetWrap: { backgroundColor: theme.colors.surfaceContainerLowest, borderTopLeftRadius: theme.borders.radius.lg, borderTopRightRadius: theme.borders.radius.lg, maxHeight: '75%' },
  sheet: { padding: theme.spacing.xl, paddingBottom: 32 },
  handle: { width: 40, height: 4, backgroundColor: theme.colors.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: theme.spacing.lg },
  sheetTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 4 },
  sheetSub: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.xl },
  inputLabel: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: '600', color: theme.colors.onSurfaceVariant, marginBottom: theme.spacing.sm, letterSpacing: 0.1 },
  inputBox: { backgroundColor: theme.colors.surfaceContainerLowest, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: theme.borders.radius.md, padding: theme.spacing.md, minHeight: 80, marginBottom: theme.spacing.lg },
  input: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface, minHeight: 64 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.borders.radius.md, backgroundColor: theme.colors.surfaceContainer },
  cancelText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: '600', color: theme.colors.onSurfaceVariant },
  confirmBtn: { flex: 2, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme.borders.radius.md, backgroundColor: theme.colors.primary },
  confirmText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: '600', color: theme.colors.onPrimary },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function FollowUpDetailScreen({ route, navigation }) {
  const { followUpId } = route.params;
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const [followUp, setFollowUp] = useState(null);
  const [requirement, setRequirement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [showCompleteSheet, setShowCompleteSheet] = useState(false);
  const [showRescheduleSheet, setShowRescheduleSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchFollowUp = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('follow_ups')
        .select(`
          *,
          crm_parties(id, display_name, mobile, city)
        `)
        .eq('id', followUpId)
        .single();

      if (fetchError) {
        setError(fetchError.code === 'PGRST116'
          ? 'Follow-up not found.'
          : 'Failed to load follow-up. Please pull to refresh.');
        console.error('[FollowUpDetail]', fetchError.code, fetchError.message);
        return;
      }
      setFollowUp(data);
      setError(null);

      // Fetch linked requirement if notes contain an ID or we can search by party
      // The follow_ups table does NOT have a requirement_id FK per our schema audit.
      // We show open requirements for this party as contextual info only.
      if (data?.party_id) {
        const { data: reqs } = await supabase
          .from('requirements')
          .select('id, product_type, quantity, unit, status, priority')
          .eq('party_id', data.party_id)
          .eq('status', 'Open')
          .order('created_at', { ascending: false })
          .limit(3);
        setRequirement(reqs || []);
      }
    } catch (err) {
      console.error('[FollowUpDetail] unexpected:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [followUpId]);

  useEffect(() => {
    fetchFollowUp();
    const unsubscribe = navigation.addListener('focus', fetchFollowUp);
    return unsubscribe;
  }, [fetchFollowUp, navigation]);

  const onRefresh = () => { setRefreshing(true); fetchFollowUp(); };

  // ─── Complete ────────────────────────────────────────────────────────────────
  const handleComplete = async (notes) => {
    if (!notes.trim()) {
      setActionError('Please enter outcome notes before completing.');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const { error } = await supabase
        .from('follow_ups')
        .update({
          status: 'Completed',
          notes: notes.trim(),
          completed_by: userProfile.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', followUpId);

      if (error) {
        if (error.code === '42501') setActionError('You do not have permission to complete this follow-up.');
        else setActionError('Failed to complete. Please try again.');
        console.error('[FollowUpDetail] complete error:', error.message);
        return;
      }

      // Log an interaction for audit trail (existing CRM pattern from LogFollowUpScreen)
      await supabase.from('interactions').insert([{
        party_id: followUp.party_id,
        user_id: userProfile.id,
        interaction_type: 'Follow-up',
        channel: 'Call',
        direction: 'Outbound',
        notes: notes.trim(),
        outcome: 'Completed',
      }]);

      setShowCompleteSheet(false);
      await fetchFollowUp();
    } catch (err) {
      setActionError('An unexpected error occurred.');
      console.error('[FollowUpDetail] complete unexpected:', err);
    } finally {
      setSaving(false);
    }
  };

  // ─── Reschedule ───────────────────────────────────────────────────────────────
  const handleReschedule = async (newDate, note) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!newDate.trim() || !dateRegex.test(newDate)) {
      setActionError('Please enter a valid date in YYYY-MM-DD format.');
      return;
    }
    const parsedDate = new Date(newDate);
    if (isNaN(parsedDate.getTime())) {
      setActionError('Invalid date. Please use YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      const updatePayload = {
        follow_up_date: newDate,
        status: 'Pending', // stays Pending after reschedule
        // Preserve original date for audit (original_follow_up_date column exists per sprint 3.fixes)
        original_follow_up_date: followUp.original_follow_up_date || followUp.follow_up_date,
      };
      if (note?.trim()) {
        updatePayload.notes = `[Rescheduled from ${followUp.follow_up_date}]: ${note.trim()}\n${followUp.notes || ''}`.trim();
      }

      const { error } = await supabase
        .from('follow_ups')
        .update(updatePayload)
        .eq('id', followUpId);

      if (error) {
        if (error.code === '42501') setActionError('You do not have permission to reschedule.');
        else setActionError('Failed to reschedule. Please try again.');
        console.error('[FollowUpDetail] reschedule error:', error.message);
        return;
      }

      setShowRescheduleSheet(false);
      await fetchFollowUp();
    } catch (err) {
      setActionError('An unexpected error occurred.');
      console.error('[FollowUpDetail] reschedule unexpected:', err);
    } finally {
      setSaving(false);
    }
  };

  // ─── Loading / Error guards ───────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Follow-up Detail" showBack={true} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error || !followUp) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Follow-up Detail" showBack={true} />
        <View style={styles.center}>
          <AlertCircle size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorText}>{error || 'Follow-up not found.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchFollowUp}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isOpen = followUp.status === 'Pending';
  const createdDate = formatDate(followUp.created_at);
  const completedDate = formatDatetime(followUp.completed_at);
  const shortId = followUpId.substring(0, 8).toUpperCase();
  const customer = followUp.crm_parties;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Follow-up Detail" showBack={true} subtitle={`FU-${shortId}`} />

      {/* Sheets */}
      <CompleteSheet
        visible={showCompleteSheet}
        onClose={() => { setShowCompleteSheet(false); setActionError(null); }}
        onConfirm={handleComplete}
        saving={saving}
      />
      <RescheduleSheet
        visible={showRescheduleSheet}
        onClose={() => { setShowRescheduleSheet(false); setActionError(null); }}
        onConfirm={handleReschedule}
        saving={saving}
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: theme.spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Action Error Banner */}
        {actionError && (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color={theme.colors.onErrorContainer} />
            <Text style={styles.errorBannerText}>{actionError}</Text>
          </View>
        )}

        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.idBadge}>
              <Text style={styles.idText}>FU-{shortId}</Text>
            </View>
            <Badge label={followUp.status} status={getStatusBadge(followUp.status)} />
          </View>
          <Text style={styles.heroReason} numberOfLines={3}>
            {followUp.reason || followUp.follow_up_reason || 'Follow-up'}
          </Text>
          {customer && (
            <TouchableOpacity
              style={styles.heroCustomerRow}
              onPress={() => navigation.navigate('CustomerDetail', { partyId: customer.id, partyName: customer.display_name })}
            >
              <Building2 size={16} color={theme.colors.secondary} />
              <Text style={styles.heroCustomerName}>{customer.display_name}</Text>
              <ChevronRight size={14} color={theme.colors.secondary} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          )}
          <View style={styles.heroPills}>
            <Badge label={followUp.priority || 'Normal'} status={getPriorityBadge(followUp.priority)} />
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>{followUp.follow_up_type || 'General'}</Text>
            </View>
          </View>
        </View>

        {/* Schedule */}
        <SectionCard icon={Calendar} title="Schedule">
          <InfoRow icon={Calendar} label="Follow-up Date" value={formatDate(followUp.follow_up_date)} />
          {followUp.original_follow_up_date && (
            <InfoRow icon={Clock} label="Original Date" value={formatDate(followUp.original_follow_up_date)} valueStyle={{ color: theme.colors.onSurfaceVariant }} />
          )}
          {followUp.completed_at && (
            <InfoRow icon={CheckCircle2} label="Completed On" value={completedDate} valueStyle={{ color: theme.colors.success }} />
          )}
        </SectionCard>

        {/* Details */}
        <SectionCard icon={ClipboardList} title="Details">
          <InfoRow icon={Tag} label="Type" value={followUp.follow_up_type || 'General'} />
          <InfoRow icon={AlertCircle} label="Priority" value={followUp.priority || 'Normal'} />
          <InfoRow icon={User} label="Created" value={createdDate} />
          {followUp.notes && (
            <View style={{ paddingTop: 12 }}>
              <Text style={{ fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>NOTES</Text>
              <Text style={{ fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface, lineHeight: 22 }}>{followUp.notes}</Text>
            </View>
          )}
        </SectionCard>

        {/* Open Requirements for this customer */}
        {requirement && requirement.length > 0 && (
          <SectionCard icon={Package} title="Open Requirements (this customer)">
            {requirement.map((req) => (
              <TouchableOpacity
                key={req.id}
                style={styles.reqLink}
                onPress={() => navigation.navigate('RequirementDetail', { requirementId: req.id, partyName: customer?.display_name })}
              >
                <View style={styles.reqLinkLeft}>
                  <Text style={styles.reqLinkTitle}>{req.product_type}</Text>
                  <Text style={styles.reqLinkSub}>{req.quantity} {req.unit}</Text>
                </View>
                <Badge label={req.status} status="warning" />
                <ChevronRight size={16} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            ))}
          </SectionCard>
        )}
      </ScrollView>

      {/* Dock */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {isOpen ? (
          <View style={styles.dockInner}>
            <TouchableOpacity style={styles.dockBtnOutline} onPress={() => { setActionError(null); setShowRescheduleSheet(true); }}>
              <RefreshCw size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.dockBtnOutlineText}>Reschedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dockBtnEdit}
              onPress={() => navigation.navigate('AddFollowUp', {
                partyId: followUp.party_id,
                partyName: customer?.display_name,
                editMode: true,
                existingFollowUp: followUp,
              })}
            >
              <PenLine size={16} color={theme.colors.secondary} />
              <Text style={styles.dockBtnEditText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dockBtnPrimary}
              onPress={() => { setActionError(null); setShowCompleteSheet(true); }}
            >
              <CheckCircle2 size={18} color={theme.colors.onPrimary} />
              <Text style={styles.dockBtnPrimaryText}>Complete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.dockInner}>
            <TouchableOpacity
              style={[styles.dockBtnPrimary, { flex: 1, backgroundColor: theme.colors.secondary }]}
              onPress={() => navigation.navigate('AddFollowUp', { partyId: followUp.party_id, partyName: customer?.display_name })}
            >
              <CalendarPlus size={18} color={theme.colors.onSecondary} />
              <Text style={[styles.dockBtnPrimaryText, { color: theme.colors.onSecondary }]}>Add New Follow-up</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  loadingText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.md },
  errorTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: '700', color: theme.colors.onSurface, marginTop: theme.spacing.md },
  errorText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4, marginBottom: theme.spacing.xl },
  retryBtn: { backgroundColor: theme.colors.secondary, paddingHorizontal: theme.spacing.xl, height: 48, borderRadius: theme.borders.radius.md, alignItems: 'center', justifyContent: 'center' },
  retryBtnText: { color: theme.colors.onSecondary, fontWeight: '600', fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg },

  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.errorContainer, padding: theme.spacing.lg, marginHorizontal: theme.spacing['screen-edge'], marginBottom: theme.spacing.lg, borderRadius: theme.borders.radius.md, gap: 10 },
  errorBannerText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onErrorContainer, flex: 1 },

  heroCard: { backgroundColor: theme.colors.surfaceContainerLowest, marginHorizontal: theme.spacing['screen-edge'], marginBottom: theme.spacing.lg, borderRadius: theme.borders.radius.lg, padding: theme.spacing.lg, ...theme.shadows.md },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.sm },
  idBadge: { backgroundColor: theme.colors.surfaceContainerHighest, paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.borders.radius.full },
  idText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600' },
  heroReason: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineSm, fontWeight: '700', color: theme.colors.onSurface, marginBottom: theme.spacing.lg, lineHeight: 28 },
  heroCustomerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.lg },
  heroCustomerName: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, fontWeight: '600', color: theme.colors.secondary, flex: 1 },
  heroPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typePill: { backgroundColor: theme.colors.surfaceContainerHighest, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borders.radius.full },
  typePillText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSurfaceVariant, fontWeight: '600' },

  reqLink: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 12 },
  reqLinkLeft: { flex: 1 },
  reqLinkTitle: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, fontWeight: '600', color: theme.colors.onSurface },
  reqLinkSub: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSurfaceVariant },

  bottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248,249,255,0.97)', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, paddingHorizontal: theme.spacing['screen-edge'] },
  dockInner: { flexDirection: 'row', gap: 10 },
  dockBtnPrimary: { flex: 2, height: 48, backgroundColor: theme.colors.primary, borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dockBtnPrimaryText: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.onPrimary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },
  dockBtnEdit: { height: 48, paddingHorizontal: theme.spacing.lg, backgroundColor: theme.colors.surfaceContainer, borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.outlineVariant },
  dockBtnEditText: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.secondary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },
  dockBtnOutline: { height: 48, paddingHorizontal: theme.spacing.lg, backgroundColor: theme.colors.surfaceContainer, borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.outlineVariant },
  dockBtnOutlineText: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.onSurfaceVariant, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },
});
