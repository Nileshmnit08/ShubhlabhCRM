import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, Linking } from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { Phone, MessageCircle, Navigation as NavigationIcon, CheckCircle, Calendar, PlusCircle, PenTool, PhoneCall, AlertCircle, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyRouteScreen({ navigation }) {
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [priorities, setPriorities] = useState([]);
  const [clientCount, setClientCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    if (!userProfile) return;
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const ownerId = userProfile.id;

      // 1. Fetch pending follow-ups
      const { data: followUpsData } = await supabase
        .from('follow_ups')
        .select(`*, crm_parties(display_name, assigned_owner_id)`)
        .eq('status', 'Pending');
      
      const allAccessibleFu = (followUpsData || []).filter(
        f => f.crm_parties !== null && (f.assigned_to === ownerId || f.crm_parties.assigned_owner_id === ownerId)
      );

      const urgentFu = allAccessibleFu.filter(t => t.follow_up_date <= todayStr || ['High', 'Urgent', 'Critical'].includes(t.priority));
      const unifiedList = urgentFu.map(t => ({
        ...t,
        _isOverdue: t.follow_up_date < todayStr,
        _isToday: t.follow_up_date === todayStr,
      }));

      unifiedList.sort((a, b) => {
        if (a._isOverdue && !b._isOverdue) return -1;
        if (!a._isOverdue && b._isOverdue) return 1;
        if (a._isToday && !b._isToday) return -1;
        if (!a._isToday && b._isToday) return 1;
        return a.follow_up_date.localeCompare(b.follow_up_date);
      });
      setPriorities(unifiedList);

      // 2. Fetch assigned client count
      const { count } = await supabase
        .from('crm_parties')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'CUSTOMER')
        .eq('assigned_owner_id', ownerId);
        
      setClientCount(count || 0);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleActionToast = (message) => {
    // Ideally use a Toast provider, falling back to alert if not wired
    alert(message);
  };

  const renderFollowUp = ({ item }) => {
    return (
      <View style={styles.followupCard}>
        <View style={styles.followupHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.followupTitle} numberOfLines={1}>{item.crm_parties?.display_name}</Text>
            <Text style={styles.followupSubtitle} numberOfLines={1}>{item.reason || item.follow_up_type}</Text>
          </View>
          {item._isOverdue ? (
            <Badge label="OVERDUE" status="error" />
          ) : (
            <Badge label="TODAY" status="warning" />
          )}
        </View>

        <View style={styles.followupMetaRow}>
          <View style={styles.metaItem}>
            <Calendar size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.metaText}>{new Date(item.follow_up_date).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.quickActionRow}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('LogFollowUp', { 
              followUpId: item.id, 
              partyId: item.party_id, 
              partyName: item.crm_parties?.display_name,
              currentReason: item.reason || item.follow_up_type
            })}>
            <Phone size={18} color={theme.colors.onPrimaryContainer} />
            <Text style={styles.quickActionText}>Log Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => handleActionToast("WhatsApp integration deferred")}>
            <MessageCircle size={18} color={theme.colors.onPrimaryContainer} />
            <Text style={styles.quickActionText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionDoneBtn} onPress={() => handleActionToast("Mark as done logic deferred")}>
            <CheckCircle size={18} color={theme.colors.onSecondaryContainer} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={theme.colors.secondary} size="large" /></View>;
  }

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]} 
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />}
    >
      {/* 1. Executive Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}</Text>
              <View style={styles.dot} />
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>Field Sales</Text>
              </View>
            </View>
            <Text style={styles.greetingTitle} numberOfLines={1}>Good morning, {userProfile?.first_name || 'User'}</Text>
          </View>
          <View style={styles.syncStatus}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Online</Text>
          </View>
        </View>
      </View>

      {/* 2. Morning Metric Pulse */}
      <View style={styles.metricGrid}>
        <Card style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Follow-ups</Text>
            <View style={[styles.metricIconBox, { backgroundColor: theme.colors.errorContainer }]}>
              <AlertCircle size={14} color={theme.colors.onErrorContainer} />
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            <Text style={styles.metricValue}>{priorities.length}</Text>
            <Text style={styles.metricSubtext}>Due today</Text>
          </View>
        </Card>
        
        <Card style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Assigned Clients</Text>
            <View style={[styles.metricIconBox, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
              <MapPin size={14} color={theme.colors.secondary} />
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            <Text style={styles.metricValue}>{clientCount}</Text>
            <Text style={styles.metricSubtext}>Active tier accounts</Text>
          </View>
        </Card>
      </View>

      {/* 3. Fast Action Quick Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickBar}>
        <TouchableOpacity style={styles.primaryCta} onPress={() => handleActionToast("Add Requirement flow starting...")}>
          <PlusCircle size={18} color={theme.colors.onSecondary} />
          <Text style={styles.primaryCtaText}>+ Requirement</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryCta} onPress={() => handleActionToast("Add Follow-up flow starting...")}>
          <Calendar size={16} color={theme.colors.secondary} />
          <Text style={styles.secondaryCtaText}>+ Follow-up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryCta} onPress={() => navigation.navigate('CallHistory')}>
          <PhoneCall size={16} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.secondaryCtaText}>Call Logs</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 4. Priority Follow-ups Today */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Priority Follow-ups Today</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{priorities.length}</Text>
          </View>
        </View>
      </View>

      {priorities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You're all caught up!</Text>
          <Text style={styles.emptySubtext}>No urgent tasks assigned for today.</Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: theme.spacing['screen-edge'] }}>
          {priorities.map(item => <React.Fragment key={item.id}>{renderFollowUp({ item })}</React.Fragment>)}
        </View>
      )}

      {/* Placeholders for deferred features to match design explicitly */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Requirements & Dispatch</Text>
      </View>
      <View style={styles.emptyContainer}>
        <Text style={styles.emptySubtext}>Logistics tracking is not yet active for your zone.</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  container: { flex: 1, backgroundColor: theme.colors.background },
  
  topBar: {
    paddingHorizontal: theme.spacing['screen-edge'],
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  greetingRow: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borders.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dateText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: theme.typography.weights.semibold, letterSpacing: 0.5 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.outline, marginHorizontal: 6 },
  rolePill: { backgroundColor: theme.colors.surfaceContainerHighest, paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.borders.radius.full },
  rolePillText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.secondary, fontWeight: theme.typography.weights.semibold },
  greetingTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineSm, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },
  
  syncStatus: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceContainerLowest, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borders.radius.full, ...theme.shadows.sm },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success, marginRight: 6 },
  syncText: { fontSize: theme.typography.sizes.labelSm, fontWeight: theme.typography.weights.semibold, color: theme.colors.onSurface },

  metricGrid: { flexDirection: 'row', paddingHorizontal: theme.spacing['screen-edge'], paddingBottom: theme.spacing.md, gap: theme.spacing.md },
  metricCard: { flex: 1, marginBottom: 0, padding: theme.spacing.md, borderRadius: theme.borders.radius.lg },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: theme.typography.weights.semibold },
  metricIconBox: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.displayMd, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },
  metricSubtext: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant },

  quickBar: { paddingHorizontal: theme.spacing['screen-edge'], paddingBottom: theme.spacing.lg, gap: theme.spacing.sm, flexDirection: 'row' },
  primaryCta: { backgroundColor: theme.colors.secondary, height: theme.spacing['touch-target'], paddingHorizontal: theme.spacing.lg, borderRadius: theme.borders.radius.full, flexDirection: 'row', alignItems: 'center', ...theme.shadows.sm },
  primaryCtaText: { color: theme.colors.onSecondary, fontSize: theme.typography.sizes.labelLg, fontWeight: theme.typography.weights.semibold, marginLeft: 8 },
  secondaryCta: { backgroundColor: theme.colors.surfaceContainerLowest, height: theme.spacing['touch-target'], paddingHorizontal: theme.spacing.lg, borderRadius: theme.borders.radius.full, flexDirection: 'row', alignItems: 'center', ...theme.shadows.sm },
  secondaryCtaText: { color: theme.colors.onSurface, fontSize: theme.typography.sizes.labelMd, fontWeight: theme.typography.weights.semibold, marginLeft: 6 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing['screen-edge'], marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  sectionTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineSm, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },
  badgeCount: { backgroundColor: theme.colors.primaryContainer, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  badgeCountText: { color: theme.colors.surfaceContainerLowest, fontSize: 10, fontWeight: 'bold' },

  followupCard: { backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borders.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, ...theme.shadows.sm },
  followupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  followupTitle: { fontSize: theme.typography.sizes.titleMd, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },
  followupSubtitle: { fontSize: theme.typography.sizes.bodySm, color: theme.colors.onSurfaceVariant, marginTop: 2 },
  followupMetaRow: { flexDirection: 'row', marginTop: 10, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  metaText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, marginLeft: 4 },
  
  quickActionRow: { flexDirection: 'row', backgroundColor: 'rgba(239, 244, 255, 0.4)', marginHorizontal: -theme.spacing.lg, marginBottom: -theme.spacing.lg, padding: theme.spacing.md, borderBottomLeftRadius: theme.borders.radius.lg, borderBottomRightRadius: theme.borders.radius.lg, gap: 8 },
  quickActionBtn: { flex: 1, height: theme.spacing['touch-target-dense'], backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...theme.shadows.sm },
  quickActionText: { color: theme.colors.onPrimaryContainer, fontSize: theme.typography.sizes.labelMd, fontWeight: theme.typography.weights.semibold, marginLeft: 6 },
  quickActionDoneBtn: { width: 44, height: 44, backgroundColor: theme.colors.secondaryContainer, borderRadius: theme.borders.radius.md, alignItems: 'center', justifyContent: 'center', ...theme.shadows.sm },

  emptyContainer: { padding: theme.spacing.xl, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: theme.typography.sizes.titleMd, fontWeight: theme.typography.weights.semibold, color: theme.colors.onSurface, marginTop: 8 },
  emptySubtext: { fontSize: theme.typography.sizes.bodySm, color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' },
});
