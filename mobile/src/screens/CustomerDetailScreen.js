import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { Phone, MessageCircle, FilePlus2, CalendarPlus, Building2, MapPin, BadgeCheck, FileText, Truck, Clock, User, Landmark, IndianRupee, Hash } from 'lucide-react-native';
import { theme } from '../theme';
import Badge from '../components/Badge';
import ScreenHeader from '../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomerDetailScreen({ route, navigation }) {
  const { customerId } = route.params;
  const insets = useSafeAreaInsets();
  
  const [customer, setCustomer] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab state: 'overview' | 'requirements' | 'dispatch' | 'history'
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchCustomerDetails();
    const unsubscribe = navigation.addListener('focus', fetchCustomerDetails);
    return unsubscribe;
  }, [navigation, customerId]);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch from crm_parties
      const { data: custData } = await supabase
        .from('crm_parties')
        .select(`*, auth_users:assigned_owner_id(email, first_name, last_name)`)
        .eq('id', customerId)
        .single();
      if (custData) setCustomer(custData);

      // 2. Fetch financial data from v_customer_360
      const { data: finData } = await supabase
        .from('v_customer_360')
        .select('*')
        .eq('customer_id', customerId)
        .single();
      if (finData) setFinancials(finData);

      // 3. Fetch requirements
      const { data: reqData } = await supabase
        .from('v_board_requirements')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (reqData) setRequirements(reqData);

      // 4. Fetch follow-ups
      const { data: followUpData } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('party_id', customerId)
        .eq('status', 'Pending')
        .order('follow_up_date', { ascending: true });
      if (followUpData) setFollowUps(followUpData);

      // 5. Fetch dispatches
      if (reqData && reqData.length > 0) {
        const reqIds = reqData.map(r => r.id);
        const { data: dispData } = await supabase
          .from('requirement_dispatches')
          .select('*')
          .in('requirement_id', reqIds)
          .order('dispatch_date', { ascending: false });
        if (dispData) setDispatches(dispData);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (!customer?.mobile) {
      alert('No phone number available.');
      return;
    }
    Linking.openURL(`tel:${customer.mobile}`);
  };

  const handleWhatsApp = () => {
    if (!customer?.mobile) {
      alert('No phone number available.');
      return;
    }
    const cleanPhone = customer.mobile.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const renderTabs = () => {
    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'requirements', label: `Requirements (${requirements.length})` },
      { id: 'dispatch', label: `Dispatch (${dispatches.length})` },
      { id: 'history', label: 'History' }
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive ? styles.tabButtonActive : styles.tabButtonInactive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  if (loading && !customer) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Customer not found.</Text>
      </View>
    );
  }

  const assignedRep = customer.auth_users ? 
    (customer.auth_users.first_name ? `${customer.auth_users.first_name} ${customer.auth_users.last_name || ''}` : customer.auth_users.email) 
    : 'Unassigned';

  const creditLimit = financials?.crm_credit_limit_amount || 0;
  const outstanding = financials?.crm_credit_outstanding_amount || 0;
  const creditUtil = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;
  const creditAvailable = Math.max(0, creditLimit - outstanding);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Customer Profile Detail" showBack={true} />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Customer Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.identityHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>{customer.id.substring(0, 8).toUpperCase()}</Text>
                </View>
                {customer.status === 'Active' ? (
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusBadgeText}>Active • {customer.party_type}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.customerName}>{customer.display_name}</Text>
            </View>
            <View style={styles.companyIcon}>
              <Building2 size={24} color={theme.colors.secondary} />
            </View>
          </View>

          <View style={styles.contactCard}>
            <View style={styles.contactRow}>
              <User size={18} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.contactName}>Primary Contact</Text>
            </View>
            <View style={styles.contactRow}>
              <Phone size={16} color={theme.colors.secondary} />
              <Text style={styles.contactValuePhone} onPress={handleCall}>{customer.mobile || 'No phone'}</Text>
            </View>
            <View style={styles.contactRow}>
              <MapPin size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.contactValueLoc}>{customer.billing_address || customer.shipping_address || 'No location specified'}</Text>
            </View>
          </View>

          <View style={styles.repRow}>
            <View style={styles.repBadge}>
              <BadgeCheck size={14} color={theme.colors.onPrimaryContainer} />
            </View>
            <Text style={styles.repText}>Rep: <Text style={styles.repTextBold}>{assignedRep}</Text></Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.tallyText}>Tally Synced</Text>
          </View>
        </View>

        {/* Quick Action Launchpad */}
        <View style={styles.launchpadGrid}>
          <TouchableOpacity style={[styles.launchpadBtn, { backgroundColor: theme.colors.primary }]} onPress={handleCall}>
            <Phone size={20} color={theme.colors.onPrimary} style={styles.launchIcon} />
            <Text style={[styles.launchpadText, { color: theme.colors.onPrimary }]}>Call Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.launchpadBtn, { backgroundColor: theme.colors.surfaceContainer }]} onPress={handleWhatsApp}>
            <MessageCircle size={20} color={theme.colors.onTertiaryContainer} style={styles.launchIcon} />
            <Text style={[styles.launchpadText, { color: theme.colors.onTertiaryContainer }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.launchpadBtn, { backgroundColor: theme.colors.surfaceContainerLowest }]} onPress={() => navigation.navigate('AddRequirement', { partyId: customer.id, partyName: customer.display_name })}>
            <FilePlus2 size={20} color={theme.colors.secondary} style={styles.launchIcon} />
            <Text style={[styles.launchpadText, { color: theme.colors.onSurface }]}>+ Req</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.launchpadBtn, { backgroundColor: theme.colors.surfaceContainerLowest }]} onPress={() => navigation.navigate('AddFollowUp', { partyId: customer.id, partyName: customer.display_name })}>
            <CalendarPlus size={20} color={theme.colors.secondary} style={styles.launchIcon} />
            <Text style={[styles.launchpadText, { color: theme.colors.onSurface }]}>+ Follow-up</Text>
          </TouchableOpacity>
        </View>

        {renderTabs()}

        {/* CRM Financial Vitals */}
        {activeTab === 'overview' && (
          <View style={styles.financialCard}>
            <View style={styles.financialHeader}>
              <Landmark size={20} color={theme.colors.secondary} />
              <Text style={styles.sectionTitle}>CRM Vital Snapshot</Text>
            </View>
            
            <View style={styles.financialGrid}>
              <View style={styles.finCell}>
                <Text style={styles.finLabel}>GSTIN</Text>
                <Text style={styles.finValue}>{customer.gstin || 'UNREGISTERED'}</Text>
              </View>
              <View style={styles.finCell}>
                <Text style={styles.finLabel}>CREDIT TERMS</Text>
                <Text style={styles.finValue}>{financials?.crm_credit_days ? `${financials.crm_credit_days} Days` : 'N/A'}</Text>
              </View>
              <View style={styles.finCell}>
                <Text style={styles.finLabel}>CREDIT LIMIT</Text>
                <Text style={styles.finValue}>{formatCurrency(creditLimit)}</Text>
              </View>
              <View style={styles.finCell}>
                <Text style={styles.finLabel}>OUTSTANDING</Text>
                <Text style={[styles.finValue, { color: theme.colors.secondary }]}>{formatCurrency(outstanding)}</Text>
              </View>
            </View>
            
            <View style={styles.creditBarContainer}>
              <View style={styles.creditBarLabels}>
                <Text style={styles.creditUtilText}>Credit Utilization ({creditUtil.toFixed(1)}%)</Text>
                <Text style={styles.creditAvailText}>{formatCurrency(creditAvailable)} Available</Text>
              </View>
              <View style={styles.creditBarTrack}>
                <View style={[styles.creditBarFill, { width: `${Math.min(100, creditUtil)}%` }]} />
              </View>
            </View>
          </View>
        )}

        {/* Dynamic Lists based on tabs */}
        {(activeTab === 'overview' || activeTab === 'requirements') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FileText size={20} color={theme.colors.secondary} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Open & Recent Requirements</Text>
              </View>
            </View>
            {requirements.length === 0 ? (
              <Text style={styles.emptyText}>No requirements logged.</Text>
            ) : (
              requirements.map(req => (
                <TouchableOpacity
                  key={req.id}
                  style={styles.reqCard}
                  onPress={() => navigation.navigate('RequirementDetail', {
                    requirementId: req.id,
                    partyName: customer.display_name,
                  })}
                  activeOpacity={0.8}
                >
                  <View style={styles.reqHeader}>
                    <Text style={styles.reqId}>REQ-{req.id.substring(0,6).toUpperCase()}</Text>
                    <Badge label={req.status} status={req.status === 'Open' ? 'warning' : 'success'} />
                  </View>
                  <Text style={styles.reqTitle}>{req.required_quantity} {req.unit} {req.product_type}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

      </ScrollView>

      {/* Persistent Floating Tactical Dock */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.dockInner}>
          <TouchableOpacity style={styles.dockBtnPrimary} onPress={handleCall}>
            <Phone size={20} color={theme.colors.onPrimary} />
            <Text style={styles.dockBtnPrimaryText}>Call {customer.display_name.split(' ')[0]}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dockBtnIcon} onPress={handleWhatsApp}>
            <MessageCircle size={24} color={theme.colors.onTertiaryContainer} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dockBtnSecondary} onPress={() => alert('Log Action deferred')}>
            <FilePlus2 size={20} color={theme.colors.onSecondary} />
            <Text style={styles.dockBtnSecondaryText}>Log Action</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: theme.colors.error, fontWeight: '600' },
  
  identityCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    margin: theme.spacing['screen-edge'],
    padding: theme.spacing.lg,
    borderRadius: theme.borders.radius.lg,
    ...theme.shadows.md,
  },
  identityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  idBadge: { backgroundColor: theme.colors.surfaceContainerHigh, paddingHorizontal: 6, paddingVertical: 2, borderRadius: theme.borders.radius.full, marginRight: 8 },
  idBadgeText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceContainerHighest, paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.borders.radius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.secondary, marginRight: 4 },
  statusBadgeText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.secondary, fontWeight: '600' },
  customerName: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineLg, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface },
  companyIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  
  contactCard: { backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  contactName: { fontSize: theme.typography.sizes.titleMd, fontWeight: '600', color: theme.colors.onSurface, marginLeft: 8 },
  contactValuePhone: { fontSize: theme.typography.sizes.bodyLg, color: theme.colors.onSurface, fontWeight: '600', marginLeft: 8, textDecorationLine: 'underline' },
  contactValueLoc: { fontSize: theme.typography.sizes.bodySm, color: theme.colors.onSurfaceVariant, marginLeft: 8, flex: 1 },

  repRow: { flexDirection: 'row', alignItems: 'center' },
  repBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  repText: { fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSurfaceVariant },
  repTextBold: { color: theme.colors.onSurface, fontWeight: '600' },
  tallyText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.secondary, fontWeight: '600', textTransform: 'uppercase' },

  launchpadGrid: { flexDirection: 'row', paddingHorizontal: theme.spacing['screen-edge'], gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  launchpadBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: theme.borders.radius.md, ...theme.shadows.sm },
  launchIcon: { marginBottom: 4 },
  launchpadText: { fontSize: theme.typography.sizes.labelSm, fontWeight: '600' },

  tabContainer: { paddingHorizontal: theme.spacing['screen-edge'], paddingVertical: 8, gap: 8, marginBottom: 8 },
  tabButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.borders.radius.full },
  tabButtonActive: { backgroundColor: theme.colors.primary },
  tabButtonInactive: { backgroundColor: theme.colors.surfaceContainer },
  tabText: { fontSize: theme.typography.sizes.labelMd, fontWeight: '600' },
  tabTextActive: { color: theme.colors.onPrimary },
  tabTextInactive: { color: theme.colors.onSurfaceVariant },

  financialCard: { backgroundColor: theme.colors.surfaceContainerLowest, marginHorizontal: theme.spacing['screen-edge'], padding: theme.spacing.lg, borderRadius: theme.borders.radius.lg, ...theme.shadows.sm, marginBottom: theme.spacing.lg },
  financialHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  sectionTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.headlineSm, fontWeight: '700', color: theme.colors.onSurface, marginLeft: 8 },
  financialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  finCell: { width: '48%', backgroundColor: theme.colors.surfaceContainerLow, borderRadius: theme.borders.radius.md, padding: 12 },
  finLabel: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600', marginBottom: 4 },
  finValue: { fontSize: theme.typography.sizes.bodyLg, color: theme.colors.onSurface, fontWeight: '600', fontFamily: 'monospace' },
  creditBarContainer: { marginTop: 4 },
  creditBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  creditUtilText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant },
  creditAvailText: { fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurface, fontWeight: '600' },
  creditBarTrack: { height: 8, backgroundColor: theme.colors.surfaceContainer, borderRadius: 4, overflow: 'hidden' },
  creditBarFill: { height: '100%', backgroundColor: theme.colors.secondary, borderRadius: 4 },

  section: { paddingHorizontal: theme.spacing['screen-edge'], marginBottom: theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  emptyText: { color: theme.colors.onSurfaceVariant, fontStyle: 'italic', fontSize: theme.typography.sizes.bodyMd },
  
  reqCard: { backgroundColor: theme.colors.surfaceContainerLowest, padding: theme.spacing.lg, borderRadius: theme.borders.radius.lg, marginBottom: theme.spacing.md, ...theme.shadows.sm },
  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reqId: { fontSize: theme.typography.sizes.labelMd, fontWeight: '600', color: theme.colors.onSurface },
  reqTitle: { fontSize: theme.typography.sizes.titleMd, fontWeight: '700', color: theme.colors.onSurface },

  bottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(248,249,255,0.95)', borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, paddingHorizontal: theme.spacing['screen-edge'], zIndex: 100 },
  dockInner: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dockBtnPrimary: { flex: 1, height: 48, backgroundColor: theme.colors.primary, borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dockBtnPrimaryText: { color: theme.colors.onPrimary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },
  dockBtnIcon: { width: 48, height: 48, backgroundColor: theme.colors.surfaceContainer, borderRadius: theme.borders.radius.md, alignItems: 'center', justifyContent: 'center' },
  dockBtnSecondary: { flex: 1, height: 48, backgroundColor: theme.colors.secondary, borderRadius: theme.borders.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dockBtnSecondaryText: { color: theme.colors.onSecondary, fontSize: theme.typography.sizes.labelLg, fontWeight: '600' },
});
