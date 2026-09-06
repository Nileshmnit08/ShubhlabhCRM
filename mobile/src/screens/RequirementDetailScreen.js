import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Badge from '../components/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Package, Hash, Scale, CalendarDays, User, Sparkles,
  Building2, ClipboardList, Truck, Tag, PenLine,
  CalendarPlus, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react-native';

// ─── Status → Badge mapping ───────────────────────────────────────────────────
function getStatusBadge(status) {
  switch (status) {
    case 'Open': return 'warning';
    case 'Fulfilled':
    case 'Completed':
    case 'Won': return 'success';
    case 'Lost':
    case 'Cancelled': return 'error';
    default: return 'default';
  }
}

// ─── Priority → Badge mapping ─────────────────────────────────────────────────
function getPriorityBadge(priority) {
  switch (priority) {
    case 'Urgent': return 'error';
    case 'High': return 'warning';
    case 'Normal': return 'info';
    default: return 'default';
  }
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, valueStyle }) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconBox}>
        <Icon size={16} color={theme.colors.secondary} />
      </View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={[infoStyles.value, valueStyle]} selectable>{value || '—'}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content: { flex: 1, justifyContent: 'center' },
  label: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: theme.typography.weights.semibold, marginBottom: 2, letterSpacing: 0.5, textTransform: 'uppercase' },
  value: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface, fontWeight: theme.typography.weights.medium },
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
  title: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function RequirementDetailScreen({ route, navigation }) {
  const { requirementId, partyName: passedPartyName } = route.params;
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const [requirement, setRequirement] = useState(null);
  const [dispatchSummary, setDispatchSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchRequirement = useCallback(async () => {
    try {
      // Fetch full requirement detail from the board view (which joins party & dispatch info)
      const { data, error: fetchError } = await supabase
        .from('v_board_requirements')
        .select('*')
        .eq('id', requirementId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Requirement not found. It may have been deleted.');
        } else if (fetchError.code === '42501') {
          setError('You do not have permission to view this requirement.');
        } else {
          setError('Failed to load requirement. Please pull to refresh.');
        }
        console.error('[RequirementDetail]', fetchError.code, fetchError.message);
        return;
      }

      setRequirement(data);
      setError(null);
    } catch (err) {
      console.error('[RequirementDetail] unexpected error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requirementId]);

  useEffect(() => {
    fetchRequirement();
    const unsubscribe = navigation.addListener('focus', fetchRequirement);
    return unsubscribe;
  }, [fetchRequirement, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequirement();
  };

  const handleEdit = () => {
    navigation.navigate('AddRequirement', {
      partyId: requirement.party_id,
      partyName: requirement.customer_name || passedPartyName,
      editMode: true,
      existingRequirement: requirement,
    });
  };

  const handleAddFollowUp = () => {
    navigation.navigate('AddFollowUp', {
      partyId: requirement.party_id,
      partyName: requirement.customer_name || passedPartyName,
    });
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Requirement Detail" showBack={true} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text style={styles.loadingText}>Loading requirement...</Text>
        </View>
      </View>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error || !requirement) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Requirement Detail" showBack={true} />
        <View style={styles.center}>
          <AlertCircle size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorText}>{error || 'Requirement not found.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchRequirement}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const customerName = requirement.customer_name || passedPartyName || 'Unknown Customer';
  const isOpen = requirement.status === 'Open';
  const createdDate = requirement.created_at
    ? new Date(requirement.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const updatedDate = requirement.updated_at
    ? new Date(requirement.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const expectedDateFormatted = requirement.expected_date
    ? new Date(requirement.expected_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const shortId = requirementId.substring(0, 8).toUpperCase();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Requirement Detail"
        showBack={true}
        subtitle={`REQ-${shortId}`}
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: theme.spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.idRow}>
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>REQ-{shortId}</Text>
                </View>
                <Badge label={requirement.status} status={getStatusBadge(requirement.status)} />
              </View>
              <Text style={styles.heroProduct} numberOfLines={2}>{requirement.product_type}</Text>
            </View>
            <View style={styles.productIconBox}>
              <Package size={24} color={theme.colors.secondary} />
            </View>
          </View>

          {/* Customer Context */}
          <View style={styles.heroCustomerRow}>
            <Building2 size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.heroCustomerText} numberOfLines={1}>{customerName}</Text>
          </View>

          {/* Quick vitals */}
          <View style={styles.vitalsRow}>
            <View style={styles.vitalCell}>
              <Text style={styles.vitalLabel}>QUANTITY</Text>
              <Text style={styles.vitalValue}>{requirement.required_quantity}</Text>
              <Text style={styles.vitalUnit}>{requirement.unit}</Text>
            </View>
            <View style={styles.vitalDivider} />
            <View style={styles.vitalCell}>
              <Text style={styles.vitalLabel}>DISPATCHED</Text>
              <Text style={[styles.vitalValue, { color: requirement.total_dispatched_quantity > 0 ? theme.colors.success : theme.colors.onSurfaceVariant }]}>
                {requirement.total_dispatched_quantity || 0}
              </Text>
              <Text style={styles.vitalUnit}>{requirement.unit}</Text>
            </View>
            <View style={styles.vitalDivider} />
            <View style={styles.vitalCell}>
              <Text style={styles.vitalLabel}>PENDING</Text>
              <Text style={[styles.vitalValue, { color: theme.colors.warning }]}>
                {requirement.pending_quantity || requirement.required_quantity}
              </Text>
              <Text style={styles.vitalUnit}>{requirement.unit}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          {requirement.required_quantity > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, {
                    width: `${Math.min(100, ((requirement.total_dispatched_quantity || 0) / requirement.required_quantity) * 100)}%`
                  }]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {Math.round(((requirement.total_dispatched_quantity || 0) / requirement.required_quantity) * 100)}% dispatched
              </Text>
            </View>
          )}
        </View>

        {/* Commercial Details */}
        <SectionCard icon={Tag} title="Commercial Details">
          <InfoRow icon={Package} label="Product" value={requirement.product_type} />
          <InfoRow icon={Scale} label="Quantity" value={`${requirement.required_quantity} ${requirement.unit}`} />
          {requirement.expected_rate && (
            <InfoRow icon={Hash} label="Expected Rate" value={`₹${Number(requirement.expected_rate).toLocaleString('en-IN')} / ${requirement.unit}`} />
          )}
          <InfoRow icon={ClipboardList} label="Intent" value={requirement.intent_type || 'Product Interest'} />
          <InfoRow icon={AlertCircle} label="Priority" value={requirement.priority} valueStyle={{ color: requirement.priority === 'Urgent' ? theme.colors.error : requirement.priority === 'High' ? theme.colors.warning : theme.colors.onSurface }} />
          <InfoRow icon={CalendarDays} label="Expected By" value={expectedDateFormatted} />
        </SectionCard>

        {/* Dispatch Summary */}
        <SectionCard icon={Truck} title="Dispatch Summary">
          <View style={styles.dispatchGrid}>
            <View style={styles.dispatchCell}>
              <Text style={styles.dispatchCellLabel}>Status</Text>
              <Badge label={requirement.dispatch_progress || 'Not Dispatched'} status={requirement.total_dispatched_quantity > 0 ? 'info' : 'default'} />
            </View>
            <View style={styles.dispatchCell}>
              <Text style={styles.dispatchCellLabel}>Last Dispatch</Text>
              <Text style={styles.dispatchCellValue}>
                {requirement.latest_dispatch_date
                  ? new Date(requirement.latest_dispatch_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                  : '—'}
              </Text>
            </View>
          </View>
          {!isOpen && (
            <View style={styles.dispatchNote}>
              <CheckCircle2 size={16} color={theme.colors.onSuccessContainer} />
              <Text style={styles.dispatchNoteText}>Dispatch editing is available for Open requirements only.</Text>
            </View>
          )}
          {isOpen && (
            <Text style={styles.deferredNote}>
              Dispatch management is available in a future sprint (MC-UI-03).
            </Text>
          )}
        </SectionCard>

        {/* Record Details */}
        <SectionCard icon={Clock} title="Record Details">
          <InfoRow icon={User} label="Assigned To" value={requirement.owner_email || 'Unassigned'} />
          <InfoRow icon={Clock} label="Created" value={createdDate} />
          <InfoRow icon={Clock} label="Last Updated" value={updatedDate} />
        </SectionCard>

        {/* Notes */}
        {requirement.notes && (
          <SectionCard icon={Sparkles} title="Notes">
            <Text style={styles.notesText}>{requirement.notes}</Text>
          </SectionCard>
        )}
      </ScrollView>

      {/* Persistent Bottom Action Dock */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.dockInner}>
          {isOpen && (
            <TouchableOpacity style={styles.dockBtnSecondary} onPress={handleEdit}>
              <PenLine size={18} color={theme.colors.secondary} />
              <Text style={styles.dockBtnSecondaryText}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.dockBtnPrimary} onPress={handleAddFollowUp}>
            <CalendarPlus size={18} color={theme.colors.onSecondary} />
            <Text style={styles.dockBtnPrimaryText}>Add Follow-up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  loadingText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.md },
  errorTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: '700', color: theme.colors.onSurface, marginTop: theme.spacing.md },
  errorText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: theme.spacing.sm, marginBottom: theme.spacing.xl },
  retryBtn: { backgroundColor: theme.colors.secondary, paddingHorizontal: theme.spacing.xl, height: 48, borderRadius: theme.borders.radius.md, alignItems: 'center', justifyContent: 'center' },
  retryBtnText: { color: theme.colors.onSecondary, fontWeight: '600', fontSize: theme.typography.sizes.labelLg, fontFamily: theme.typography.fontFamily.body },

  heroCard: {
    backgroundColor: theme.colors.surfaceContainerLowest, marginHorizontal: theme.spacing['screen-edge'],
    marginBottom: theme.spacing.lg, borderRadius: theme.borders.radius.lg, padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  idBadge: { backgroundColor: theme.colors.surfaceContainerHighest, paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.borders.radius.full },
  idBadgeText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600' },
  heroProduct: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineSm, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },
  productIconBox: { width: 48, height: 48, backgroundColor: theme.colors.surfaceContainerLow, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  heroCustomerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.lg, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  heroCustomerText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant, flex: 1 },

  vitalsRow: { flexDirection: 'row', backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  vitalCell: { flex: 1, alignItems: 'center' },
  vitalDivider: { width: 1, backgroundColor: theme.colors.border, marginHorizontal: 8 },
  vitalLabel: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600', letterSpacing: 0.5 },
  vitalValue: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.displayMd, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },
  vitalUnit: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant },

  progressContainer: { marginTop: 4 },
  progressTrack: { height: 6, backgroundColor: theme.colors.surfaceContainer, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: theme.colors.success, borderRadius: 3 },
  progressLabel: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, textAlign: 'right' },

  dispatchGrid: { flexDirection: 'row', gap: 16, marginTop: 4 },
  dispatchCell: { flex: 1 },
  dispatchCellLabel: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  dispatchCellValue: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface, fontWeight: '600' },
  dispatchNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: theme.spacing.lg, backgroundColor: theme.colors.successContainer, padding: theme.spacing.md, borderRadius: theme.borders.radius.md },
  dispatchNoteText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSuccessContainer, flex: 1 },
  deferredNote: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.md, fontStyle: 'italic' },

  notesText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface, lineHeight: 22 },

  bottomDock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(248,249,255,0.97)', borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingTop: 12, paddingHorizontal: theme.spacing['screen-edge'],
  },
  dockInner: { flexDirection: 'row', gap: 12 },
  dockBtnPrimary: { flex: 1, height: 48, backgroundColor: theme.colors.secondary, borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dockBtnPrimaryText: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.onSecondary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },
  dockBtnSecondary: { height: 48, paddingHorizontal: theme.spacing.xl, backgroundColor: theme.colors.surfaceContainer, borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant },
  dockBtnSecondaryText: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.secondary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },
});
