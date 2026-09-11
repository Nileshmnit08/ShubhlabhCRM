import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Animated,
} from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import {
  Users, Phone, Mic, MapPin, CalendarClock, BarChart3,
  AlertTriangle, BookUser, VoicemailIcon, Map, ShieldCheck,
  RefreshCw, LogOut, Settings,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

// ─── Design tokens matching Stitch Admin Control Center ───────────────────────
const C = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceContainer: '#E5EEFF',
  surfaceContainerLow: '#EFF4FF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerHigh: '#DCE9FF',
  primary: '#0F172A',
  secondary: '#2563EB',
  error: '#EF4444',
  errorContainer: '#FFDAD6',
  onError: '#FFFFFF',
  onErrorContainer: '#93000A',
  teal: '#0C9488',
  onSurface: '#0B1C30',
  onSurfaceVariant: '#45464D',
  border: '#E2E8F0',
  textXs: 11,
  textSm: 12,
  textBase: 14,
  textMd: 16,
  textLg: 18,
  textXl: 22,
  textDisplay: 28,
};

// ─── Live clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <Text style={s.clockText}>{time}</Text>;
}

// ─── Pulse dot animation ───────────────────────────────────────────────────────
function PulseDot({ color = C.teal }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ width: 10, height: 10, marginRight: 8 }}>
      <Animated.View style={{
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: color + '40',
        position: 'absolute',
        transform: [{ scale }],
      }} />
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}

// ─── KPI tile ────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, subColor, icon: Icon, iconColor }) {
  return (
    <View style={s.kpiTile}>
      <View style={s.kpiRow}>
        <Text style={s.kpiLabel}>{label}</Text>
        <Icon size={16} color={iconColor || C.onSurfaceVariant} />
      </View>
      <Text style={s.kpiValue}>{value}</Text>
      {sub ? <Text style={[s.kpiSub, { color: subColor || C.onSurfaceVariant }]}>{sub}</Text> : null}
    </View>
  );
}

// ─── Shortcut button ─────────────────────────────────────────────────────────
function ShortcutBtn({ label, icon: Icon, iconColor, onPress }) {
  return (
    <TouchableOpacity style={s.shortcut} onPress={onPress}>
      <View style={[s.shortcutIcon, { backgroundColor: C.surfaceContainer }]}>
        <Icon size={18} color={iconColor || C.onSurface} />
      </View>
      <Text style={s.shortcutLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Exception card ──────────────────────────────────────────────────────────
function ExceptionCard({ title, sub, detail, badge, badgeColor, badgeBg }) {
  return (
    <View style={s.exceptionCard}>
      <View style={s.exceptionHeader}>
        <View style={s.exceptionIconBox}>
          <AlertTriangle size={18} color={C.error} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.exceptionTitle} numberOfLines={1}>{title}</Text>
          <Text style={s.exceptionSub}>{sub}</Text>
        </View>
        <View style={[s.exceptionBadge, { backgroundColor: badgeBg || C.errorContainer }]}>
          <Text style={[s.exceptionBadgeText, { color: badgeColor || C.onErrorContainer }]}>{badge}</Text>
        </View>
      </View>
      {detail ? (
        <View style={s.exceptionDetail}>
          <Text style={s.exceptionDetailText}>{detail}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AdminControlCenterScreen({ navigation }) {
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [kpis, setKpis] = useState({
    activeStaff: 0,
    totalStaff: 0,
    callsLogged: 0,
    openFollowUps: 0,
    overdueFollowUps: 0,
    openPipeline: 0,
    activeCustomers: 0,
    exceptions: 0,
    gpsActive: 0,
  });

  const [exceptionItems, setExceptionItems] = useState([]);

  const todayStr = () => new Date().toISOString().split('T')[0];
  const dateLabel = () => {
    const d = new Date();
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const fetchData = async () => {
    try {
      // 1. Field staff counts from app_users
      const { data: staffData } = await supabase
        .from('app_users')
        .select('id, display_name, role, is_active')
        .eq('is_active', true)
        .neq('role', 'Admin');

      const totalStaff = staffData?.length || 0;

      // 2. Today's interactions as "calls logged"
      const today = todayStr();
      const { count: callsCount } = await supabase
        .from('interactions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59');

      // 3. Follow-ups
      const { count: openFups } = await supabase
        .from('follow_ups')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pending');

      const { count: overdueFups } = await supabase
        .from('follow_ups')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pending')
        .lt('follow_up_date', today);

      // 4. Pipeline (open requirements)
      const { count: pipelineCount } = await supabase
        .from('requirements')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'New');

      // 5. Active customers
      const { count: activeCust } = await supabase
        .from('v_customer_360')
        .select('customer_id', { count: 'exact', head: true })
        .eq('crm_status', 'Active');

      // 6. GPS Active (unique users logging location today)
      const { data: gpsData } = await supabase
        .from('staff_location_events')
        .select('user_id')
        .gte('created_at', today + 'T00:00:00');
      
      const uniqueGpsUsers = new Set((gpsData || []).map(row => row.user_id)).size;

      // 6. Exception items — overdue follow-ups as exception cards
      const { data: overdueItems } = await supabase
        .from('follow_ups')
        .select('id, reason, party_id, follow_up_date, priority')
        .eq('status', 'Pending')
        .lt('follow_up_date', today)
        .order('follow_up_date', { ascending: true })
        .limit(3);

      // Build exception cards from real overdue follow-ups
      const items = (overdueItems || []).map(f => ({
        id: f.id,
        title: f.reason || 'Overdue Follow-up',
        sub: `Due: ${f.follow_up_date}`,
        detail: `Priority: ${f.priority || 'Normal'} — This follow-up has passed its scheduled date.`,
        badge: f.priority === 'High' ? 'High Alert' : 'Overdue',
        badgeColor: C.onErrorContainer,
        badgeBg: C.errorContainer,
      }));

      const exceptionCount = items.length + (overdueFups || 0) > items.length
        ? overdueFups || 0
        : items.length;

      setKpis({
        activeStaff: totalStaff, // Real total field staff
        totalStaff,
        callsLogged: callsCount || 0,
        openFollowUps: openFups || 0,
        overdueFollowUps: overdueFups || 0,
        openPipeline: pipelineCount || 0,
        activeCustomers: activeCust || 0,
        exceptions: overdueFups || 0,
        gpsActive: uniqueGpsUsers || 0,
      });
      setExceptionItems(items);
    } catch (err) {
      console.error('[AdminControlCenter] Data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const adminInitials = (userProfile?.display_name || 'AD')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ── Top Header ── */}
      <View style={s.appBar}>
        <View>
          <Text style={s.appBarTitle}>Shubh Labh CRM</Text>
          <View style={s.onlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>Online</Text>
          </View>
        </View>
        <View style={s.appBarRight}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{adminInitials}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.secondary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.content}>
          {/* ── Control Center Identity Card ── */}
          <View style={s.identityCard}>
            <View style={s.identityTop}>
              <View>
                <Text style={s.workspaceLabel}>DIRECTORATE WORKSPACE</Text>
                <Text style={s.ccTitle}>Operational Control Center</Text>
                <Text style={s.ccDate}>{dateLabel()}</Text>
              </View>
              <View style={s.adminBadgeBox}>
                <Text style={s.adminBadgeText}>System Admin</Text>
                <Text style={s.adminIdText}>{userProfile?.display_name || 'Admin'}</Text>
              </View>
            </View>
            {/* Live telemetry strip */}
            <View style={s.telemetryStrip}>
              <View style={s.telemetryLeft}>
                <PulseDot color={C.teal} />
                <Text style={s.telemetryText}>System Normal • {kpis.totalStaff} Staff Registered</Text>
              </View>
              <LiveClock />
            </View>
          </View>

          {/* ── 8 KPI Tiles ── */}
          {loading && !refreshing ? (
            <View style={s.loaderBox}>
              <ActivityIndicator color={C.secondary} size="large" />
            </View>
          ) : (
            <View style={s.kpiGrid}>
              <KpiTile
                label="Field Staff"
                value={`${kpis.activeStaff}/${kpis.totalStaff}`}
                sub={`${kpis.totalStaff - kpis.activeStaff} Reps Offline`}
                subColor={C.teal}
                icon={Users}
                iconColor={C.teal}
              />
              <KpiTile
                label="Calls Logged"
                value={String(kpis.callsLogged)}
                sub="Today"
                subColor={C.secondary}
                icon={Phone}
                iconColor={C.secondary}
              />
              <KpiTile
                label="Follow-up Ledger"
                value={String(kpis.openFollowUps)}
                sub={kpis.overdueFollowUps > 0 ? `${kpis.overdueFollowUps} Critical Overdue` : 'All On Track'}
                subColor={kpis.overdueFollowUps > 0 ? C.error : C.teal}
                icon={CalendarClock}
                iconColor={kpis.overdueFollowUps > 0 ? C.error : C.teal}
              />
              <KpiTile
                label="Pipeline"
                value={String(kpis.openPipeline)}
                sub="Open Deals"
                subColor={C.onSurface}
                icon={BarChart3}
                iconColor={C.primary}
              />
              <KpiTile
                label="Active Customers"
                value={String(kpis.activeCustomers)}
                sub="CRM Records"
                subColor={C.onSurfaceVariant}
                icon={BookUser}
                iconColor={C.secondary}
              />
              <KpiTile
                label="Exceptions"
                value={String(kpis.exceptions)}
                sub={kpis.exceptions > 0 ? 'Needs Review' : 'All Clear'}
                subColor={kpis.exceptions > 0 ? C.error : C.teal}
                icon={AlertTriangle}
                iconColor={kpis.exceptions > 0 ? C.error : C.teal}
              />
              <KpiTile
                label="GPS Active"
                value={String(kpis.gpsActive)}
                sub="Staff Live Today"
                subColor={kpis.gpsActive > 0 ? C.teal : C.onSurfaceVariant}
                icon={MapPin}
                iconColor={kpis.gpsActive > 0 ? C.teal : C.onSurfaceVariant}
              />
              <KpiTile
                label="Audio Vault"
                value="—"
                sub="Unavailable"
                subColor={C.onSurfaceVariant}
                icon={Mic}
                iconColor={C.onSurfaceVariant}
              />
            </View>
          )}

          {/* ── Shortcut Buttons ── */}
          <View style={s.shortcuts}>
            <ShortcutBtn label="Directory" icon={BookUser} iconColor={C.onSurface} onPress={() => navigation.navigate('MyCustomers')} />
            <ShortcutBtn label="Call Vault" icon={Phone} iconColor={C.secondary} onPress={() => navigation.navigate('CallHistory')} />
            <ShortcutBtn label="Radar Map" icon={Map} iconColor={C.teal} onPress={() => alert('Radar Map is currently unavailable.')} />
            <ShortcutBtn label="Audit Logs" icon={ShieldCheck} iconColor={C.onSurfaceVariant} onPress={() => navigation.navigate('ActivityList')} />
          </View>

          {/* ── Exceptions Section ── */}
          <View style={s.sectionHeader}>
            <View style={s.sectionHeaderLeft}>
              <View style={[s.sectionDot, { backgroundColor: C.error }]} />
              <Text style={s.sectionTitle}>EXCEPTIONS & NEEDS ATTENTION</Text>
            </View>
            {kpis.exceptions > 0 && (
              <View style={[s.alertBadge, { backgroundColor: C.errorContainer }]}>
                <Text style={[s.alertBadgeText, { color: C.onErrorContainer }]}>
                  {kpis.exceptions} Overdue
                </Text>
              </View>
            )}
          </View>

          {exceptionItems.length === 0 ? (
            <View style={s.emptyExceptions}>
              <ShieldCheck size={32} color={C.teal} />
              <Text style={s.emptyExceptionsText}>No critical exceptions — system normal.</Text>
            </View>
          ) : (
            exceptionItems.map(ex => (
              <ExceptionCard key={ex.id} {...ex} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // App bar
  appBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  appBarTitle: { fontSize: C.textLg, fontWeight: '700', color: C.onSurface, fontFamily: theme.typography.fontFamily.display },
  onlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#059669', marginRight: 5 },
  onlineText: { fontSize: C.textXs, color: C.onSurfaceVariant, fontWeight: '600' },
  appBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },

  // Identity card
  identityCard: {
    backgroundColor: C.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  identityTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  workspaceLabel: { fontSize: C.textXs, color: C.secondary, fontWeight: '700', letterSpacing: 1.2 },
  ccTitle: { fontSize: C.textLg, fontWeight: '700', color: C.onSurface, fontFamily: theme.typography.fontFamily.display, marginTop: 2 },
  ccDate: { fontSize: C.textXs, color: C.onSurfaceVariant, marginTop: 3 },
  adminBadgeBox: { alignItems: 'flex-end' },
  adminBadgeText: { fontSize: C.textXs, color: C.onSurface, backgroundColor: C.surfaceContainerHigh, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, fontWeight: '600' },
  adminIdText: { fontSize: C.textXs, color: C.onSurfaceVariant, marginTop: 4 },

  // Telemetry strip
  telemetryStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.surfaceContainerLow, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  telemetryLeft: { flexDirection: 'row', alignItems: 'center' },
  telemetryText: { fontSize: C.textSm, color: C.onSurface, fontWeight: '600' },
  clockText: { fontSize: C.textSm, color: C.onSurfaceVariant, fontFamily: 'monospace' },

  // KPI grid
  loaderBox: { paddingVertical: 40, alignItems: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiTile: {
    width: '47.5%',
    backgroundColor: C.surface, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    gap: 4,
  },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { fontSize: C.textXs, color: C.onSurfaceVariant, fontWeight: '600', flex: 1 },
  kpiValue: { fontSize: 26, fontWeight: '700', color: C.onSurface, fontFamily: theme.typography.fontFamily.display },
  kpiSub: { fontSize: C.textXs, fontWeight: '600' },

  // Shortcuts
  shortcuts: { flexDirection: 'row', justifyContent: 'space-between' },
  shortcut: { alignItems: 'center', gap: 6, flex: 1 },
  shortcutIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  shortcutLabel: { fontSize: C.textXs, color: C.onSurface, fontWeight: '600', textAlign: 'center' },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: C.textXs, fontWeight: '700', color: C.onSurface, letterSpacing: 1.1 },
  alertBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  alertBadgeText: { fontSize: C.textXs, fontWeight: '700' },

  // Exception cards
  exceptionCard: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  exceptionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  exceptionIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  exceptionTitle: { fontSize: C.textMd, fontWeight: '700', color: C.onSurface },
  exceptionSub: { fontSize: C.textXs, color: C.onSurfaceVariant, marginTop: 2 },
  exceptionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, flexShrink: 0 },
  exceptionBadgeText: { fontSize: C.textXs, fontWeight: '700' },
  exceptionDetail: { backgroundColor: C.surfaceContainerLow, borderRadius: 8, padding: 10 },
  exceptionDetailText: { fontSize: C.textSm, color: C.onSurfaceVariant, lineHeight: 18 },

  // Empty exceptions
  emptyExceptions: { alignItems: 'center', padding: 24, gap: 10 },
  emptyExceptionsText: { fontSize: C.textBase, color: C.onSurfaceVariant, textAlign: 'center', fontStyle: 'italic' },
});
