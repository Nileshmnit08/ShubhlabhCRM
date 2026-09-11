import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Linking,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Badge from '../components/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Truck, Package, FileText, CalendarDays, Hash,
  User, Building2, MapPin, Phone, AlertCircle,
  PenLine, ArrowRight, CheckCircle2, RotateCcw, XCircle,
  ClipboardList, Scale, Clock, IndianRupee,
} from 'lucide-react-native';

// ─── Status helpers ────────────────────────────────────────────────────────────
function getStatusBadge(status) {
  switch (status) {
    case 'Dispatched': return 'info';
    case 'Delivered': return 'success';
    case 'Delayed': return 'warning';
    case 'Cancelled': return 'error';
    case 'Returned': return 'default';
    default: return 'default';
  }
}

function isTerminal(status) {
  return status === 'Cancelled' || status === 'Returned';
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, valueStyle, mono }) {
  if (!value && value !== 0) return null;
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconBox}>
        <Icon size={15} color={theme.colors.secondary} />
      </View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={[infoStyles.value, mono && infoStyles.mono, valueStyle]} selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  iconBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  content: { flex: 1, justifyContent: 'center' },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelSm,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600', marginBottom: 2,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  value: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurface,
    fontWeight: theme.typography.weights.medium,
  },
  mono: { fontFamily: 'monospace' },
});

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, children }) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <Icon size={17} color={theme.colors.secondary} />
        <Text style={cardStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.borders.radius.lg,
    marginHorizontal: theme.spacing['screen-edge'],
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 4,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.titleMd,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.onSurface,
  },
});

// ─── Vitals Grid ──────────────────────────────────────────────────────────────
function VitalsGrid({ quantity, unit, returnQty, shortageQty }) {
  const netQty = quantity - (returnQty || 0);
  return (
    <View style={vitStyles.grid}>
      <View style={vitStyles.cell}>
        <Text style={vitStyles.label}>DISPATCHED</Text>
        <Text style={vitStyles.value}>{quantity}</Text>
        <Text style={vitStyles.unit}>{unit}</Text>
      </View>
      <View style={vitStyles.divider} />
      <View style={vitStyles.cell}>
        <Text style={vitStyles.label}>RETURNED</Text>
        <Text style={[vitStyles.value, returnQty > 0 && vitStyles.valueAlert]}>
          {returnQty || 0}
        </Text>
        <Text style={vitStyles.unit}>{unit}</Text>
      </View>
      <View style={vitStyles.divider} />
      <View style={vitStyles.cell}>
        <Text style={vitStyles.label}>NET QTY</Text>
        <Text style={[vitStyles.value, vitStyles.valueSuccess]}>{netQty}</Text>
        <Text style={vitStyles.unit}>{unit}</Text>
      </View>
      {shortageQty > 0 && (
        <>
          <View style={vitStyles.divider} />
          <View style={vitStyles.cell}>
            <Text style={vitStyles.label}>SHORTAGE</Text>
            <Text style={[vitStyles.value, vitStyles.valueAlert]}>{shortageQty}</Text>
            <Text style={vitStyles.unit}>{unit}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const vitStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row', backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borders.radius.md, padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cell: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: theme.colors.border, marginHorizontal: 4 },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant,
    fontWeight: '600', letterSpacing: 0.5, marginBottom: 4,
  },
  value: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displayMd,
    fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface,
  },
  valueSuccess: { color: theme.colors.success },
  valueAlert: { color: theme.colors.error },
  unit: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant,
  },
});

// ─── Status Progress Strip ────────────────────────────────────────────────────
const STATUS_ORDER = ['Dispatched', 'Delivered'];

function StatusStrip({ status }) {
  if (status === 'Cancelled' || status === 'Returned' || status === 'Delayed') {
    return (
      <View style={stripStyles.container}>
        <Badge
          label={status}
          status={getStatusBadge(status)}
        />
      </View>
    );
  }
  const currentIdx = STATUS_ORDER.indexOf(status);
  return (
    <View style={stripStyles.row}>
      {STATUS_ORDER.map((s, i) => {
        const done = i <= currentIdx;
        return (
          <React.Fragment key={s}>
            <View style={[stripStyles.step, done && stripStyles.stepDone]}>
              {done
                ? <CheckCircle2 size={14} color={theme.colors.onSecondary} />
                : <View style={stripStyles.stepDot} />
              }
              <Text style={[stripStyles.stepLabel, done && stripStyles.stepLabelDone]}>{s}</Text>
            </View>
            {i < STATUS_ORDER.length - 1 && (
              <View style={[stripStyles.connector, done && i < currentIdx && stripStyles.connectorDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stripStyles = StyleSheet.create({
  container: { alignItems: 'flex-start', marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  step: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.borders.radius.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  stepDone: { backgroundColor: theme.colors.secondary },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.onSurfaceVariant },
  stepLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600',
  },
  stepLabelDone: { color: theme.colors.onSecondary },
  connector: { flex: 1, height: 2, backgroundColor: theme.colors.border, marginHorizontal: 4 },
  connectorDone: { backgroundColor: theme.colors.secondary },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function DispatchDetailScreen({ route, navigation }) {
  const { dispatchId, requirementId: passedReqId, partyName: passedPartyName } = route.params;
  const insets = useSafeAreaInsets();

  const [dispatch, setDispatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDispatch = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('requirement_dispatches')
        .select(`
          *,
          requirements (
            id, quantity, unit, status, product_type, party_id,
            crm_parties (id, display_name, mobile, city)
          )
        `)
        .eq('id', dispatchId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Dispatch record not found. It may have been deleted.');
        } else if (fetchError.code === '42501') {
          setError('You do not have permission to view this dispatch.');
        } else {
          setError('Failed to load dispatch. Please pull to refresh.');
        }
        console.error('[DispatchDetail]', fetchError.code, fetchError.message);
        return;
      }

      setDispatch(data);
      setError(null);
    } catch (err) {
      console.error('[DispatchDetail] unexpected error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatchId]);

  useEffect(() => {
    fetchDispatch();
    const unsub = navigation.addListener('focus', fetchDispatch);
    return unsub;
  }, [fetchDispatch, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDispatch();
  };

  const handleUpdate = () => {
    navigation.navigate('UpdateDispatch', {
      dispatchId,
      currentStatus: dispatch.status,
      currentQuantity: dispatch.quantity,
    });
  };

  const handleViewRequirement = () => {
    const reqId = dispatch?.requirement_id || passedReqId;
    const customer = dispatch?.requirements?.crm_parties;
    navigation.navigate('RequirementDetail', {
      requirementId: reqId,
      partyName: customer?.display_name || passedPartyName,
    });
  };

  const handleDriverCall = () => {
    const mobile = dispatch?.driver_mobile;
    if (mobile) Linking.openURL(`tel:${mobile}`);
  };

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Dispatch Detail" showBack={true} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text style={styles.loadingText}>Loading dispatch...</Text>
        </View>
      </View>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (error || !dispatch) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Dispatch Detail" showBack={true} />
        <View style={styles.center}>
          <AlertCircle size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorText}>{error || 'Dispatch not found.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchDispatch}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const req = dispatch.requirements;
  const party = req?.crm_parties;
  const customerName = party?.display_name || passedPartyName || 'Unknown Customer';
  const shortId = dispatchId.substring(0, 8).toUpperCase();
  const dispatchDateFmt = dispatch.dispatch_date
    ? new Date(dispatch.dispatch_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const terminal = isTerminal(dispatch.status);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Dispatch Detail"
        showBack={true}
        subtitle={`DSP-${shortId}`}
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: theme.spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Card ──────────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.idRow}>
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>DSP-{shortId}</Text>
                </View>
                <Badge label={dispatch.status} status={getStatusBadge(dispatch.status)} />
              </View>
              <Text style={styles.heroProduct}>{req?.product_type || 'Dispatch'}</Text>
              <Text style={styles.heroCustomer}>{customerName}</Text>
            </View>
            <View style={styles.truckIconBox}>
              <Truck size={24} color={theme.colors.secondary} />
            </View>
          </View>

          {/* Status progress strip */}
          <StatusStrip status={dispatch.status} />

          {/* Quantity vitals */}
          <VitalsGrid
            quantity={dispatch.quantity}
            unit={dispatch.unit || req?.unit || 'Bags'}
            returnQty={dispatch.return_quantity}
            shortageQty={dispatch.shortage_quantity}
          />

          {/* Dispatch date + req link */}
          <View style={styles.heroFooter}>
            <View style={styles.heroDateRow}>
              <CalendarDays size={14} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.heroDateText}>Dispatched on {dispatchDateFmt}</Text>
            </View>
            <TouchableOpacity style={styles.reqLink} onPress={handleViewRequirement}>
              <Text style={styles.reqLinkText}>View Requirement</Text>
              <ArrowRight size={14} color={theme.colors.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Logistics ──────────────────────────────────────────────────── */}
        <SectionCard icon={Truck} title="Logistics">
          <InfoRow icon={Hash} label="Vehicle Number" value={dispatch.truck_number} mono />
          <InfoRow icon={Building2} label="Transporter" value={dispatch.transporter_name} />
          <InfoRow icon={User} label="Driver Name" value={dispatch.driver_name} />
          <InfoRow
            icon={Phone}
            label="Driver Mobile"
            value={dispatch.driver_mobile}
            valueStyle={{ color: theme.colors.secondary, textDecorationLine: 'underline' }}
          />
          <InfoRow icon={MapPin} label="Warehouse / Origin" value={dispatch.warehouse_location} />
          {dispatch.freight_amount > 0 && (
            <InfoRow icon={IndianRupee} label="Freight Amount" value={`₹${Number(dispatch.freight_amount).toLocaleString('en-IN')}`} />
          )}
        </SectionCard>

        {/* ─── Documentation & Billing ────────────────────────────────────── */}
        <SectionCard icon={FileText} title="Documentation & Billing">
          <InfoRow icon={Hash} label="Invoice Number" value={dispatch.invoice_number} mono />
          <InfoRow
            icon={CalendarDays}
            label="Invoice Date"
            value={dispatch.invoice_date
              ? new Date(dispatch.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : null}
          />
          <InfoRow icon={Hash} label="LR / Bilty Number" value={dispatch.lr_bilty_number} mono />
          <InfoRow
            icon={CalendarDays}
            label="Expected Delivery"
            value={dispatch.expected_delivery_date
              ? new Date(dispatch.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : null}
          />
        </SectionCard>

        {/* ─── Delivery Info (conditionally shown) ────────────────────────── */}
        {(dispatch.actual_delivery_date || dispatch.received_by) && (
          <SectionCard icon={CheckCircle2} title="Delivery Confirmation">
            <InfoRow
              icon={CalendarDays}
              label="Actual Delivery Date"
              value={dispatch.actual_delivery_date
                ? new Date(dispatch.actual_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : null}
            />
            <InfoRow icon={User} label="Received By" value={dispatch.received_by} />
          </SectionCard>
        )}

        {/* ─── Cancellation / Return Reason ───────────────────────────────── */}
        {(dispatch.cancellation_reason) && (
          <SectionCard icon={XCircle} title="Cancellation / Return Reason">
            <Text style={styles.reasonText}>{dispatch.cancellation_reason}</Text>
          </SectionCard>
        )}

        {/* ─── Remarks ────────────────────────────────────────────────────── */}
        {dispatch.remarks && (
          <SectionCard icon={ClipboardList} title="Remarks">
            <Text style={styles.remarksText}>{dispatch.remarks}</Text>
          </SectionCard>
        )}

        {/* ─── Record Info ────────────────────────────────────────────────── */}
        <SectionCard icon={Clock} title="Record Details">
          <InfoRow
            icon={Clock}
            label="Created"
            value={dispatch.created_at
              ? new Date(dispatch.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : null}
          />
          <InfoRow
            icon={Clock}
            label="Last Updated"
            value={dispatch.updated_at
              ? new Date(dispatch.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : null}
          />
        </SectionCard>
      </ScrollView>

      {/* ─── Bottom Action Dock ───────────────────────────────────────────── */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.dockInner}>
          <TouchableOpacity style={styles.dockBtnOutline} onPress={handleViewRequirement}>
            <Package size={18} color={theme.colors.secondary} />
            <Text style={styles.dockBtnOutlineText}>Requirement</Text>
          </TouchableOpacity>
          {dispatch.driver_mobile ? (
            <TouchableOpacity style={styles.dockBtnOutline} onPress={handleDriverCall}>
              <Phone size={18} color={theme.colors.secondary} />
              <Text style={styles.dockBtnOutlineText}>Call Driver</Text>
            </TouchableOpacity>
          ) : null}
          {!terminal && (
            <TouchableOpacity style={styles.dockBtnPrimary} onPress={handleUpdate}>
              <PenLine size={18} color={theme.colors.onSecondary} />
              <Text style={styles.dockBtnPrimaryText}>Update Dispatch</Text>
            </TouchableOpacity>
          )}
          {terminal && (
            <View style={styles.dockBtnLocked}>
              <Text style={styles.dockBtnLockedText}>{dispatch.status} — No Further Updates</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  loadingText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.md,
  },
  errorTitle: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.titleMd, fontWeight: '700',
    color: theme.colors.onSurface, marginTop: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center', marginTop: theme.spacing.sm, marginBottom: theme.spacing.xl,
  },
  retryBtn: {
    backgroundColor: theme.colors.secondary, paddingHorizontal: theme.spacing.xl,
    height: 48, borderRadius: theme.borders.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  retryBtnText: {
    color: theme.colors.onSecondary, fontWeight: '600',
    fontSize: theme.typography.sizes.labelLg,
    fontFamily: theme.typography.fontFamily.body,
  },

  heroCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    marginHorizontal: theme.spacing['screen-edge'],
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borders.radius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  idBadge: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: theme.borders.radius.full,
  },
  idBadgeText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelSm,
    color: theme.colors.onSurfaceVariant, fontWeight: '600',
  },
  heroProduct: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.headlineSm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.onSurface, marginBottom: 4,
  },
  heroCustomer: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
  },
  truckIconBox: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.sm },
  heroDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroDateText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelMd,
    color: theme.colors.onSurfaceVariant,
  },
  reqLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reqLinkText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelMd,
    color: theme.colors.secondary, fontWeight: '600',
  },

  reasonText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.error, lineHeight: 22,
  },
  remarksText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurface, lineHeight: 22,
  },

  bottomDock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(248,249,255,0.97)',
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingTop: 12, paddingHorizontal: theme.spacing['screen-edge'],
  },
  dockInner: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dockBtnPrimary: {
    flex: 1, height: 48, backgroundColor: theme.colors.secondary,
    borderRadius: theme.borders.radius.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  dockBtnPrimaryText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onSecondary,
    fontSize: theme.typography.sizes.labelLg, fontWeight: '600',
  },
  dockBtnOutline: {
    height: 48, paddingHorizontal: 14,
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.borders.radius.md,
    borderWidth: 1, borderColor: theme.colors.outlineVariant,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  dockBtnOutlineText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.secondary,
    fontSize: theme.typography.sizes.labelMd, fontWeight: '600',
  },
  dockBtnLocked: {
    flex: 1, height: 48, backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: theme.borders.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  dockBtnLockedText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onSurfaceVariant,
    fontSize: theme.typography.sizes.labelMd, fontWeight: '600',
  },
});
