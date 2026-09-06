import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { MapPin, Phone, Building, CheckCircle, MessageSquare, PlusCircle, FileText, Truck, Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import Card from '../components/Card';
import Badge from '../components/Badge';

export default function CustomerDetailScreen({ route, navigation }) {
  const { customerId } = route.params;
  const { t } = useTranslation();
  const [customer, setCustomer] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerDetails();
    const unsubscribe = navigation.addListener('focus', fetchCustomerDetails);
    return unsubscribe;
  }, [navigation, customerId]);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      const { data: custData } = await supabase
        .from('crm_parties')
        .select('*')
        .eq('id', customerId)
        .single();
      if (custData) setCustomer(custData);

      const { data: intData } = await supabase
        .from('interactions')
        .select('*')
        .eq('party_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (intData) setInteractions(intData);

      const { data: reqData } = await supabase
        .from('v_board_requirements')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (reqData) setRequirements(reqData);

      const { data: followUpData } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('party_id', customerId)
        .eq('status', 'Pending')
        .order('follow_up_date', { ascending: true });
      if (followUpData) setFollowUps(followUpData);

      // Fetch dispatches tied to requirements of this customer
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
      Alert.alert(t('error', 'Error'), t('msg_no_phone', 'No phone number available.'));
      return;
    }
    Linking.openURL(`tel:${customer.mobile}`);
  };

  const handleWhatsApp = () => {
    if (!customer?.mobile) {
      Alert.alert(t('error', 'Error'), t('msg_no_phone', 'No phone number available.'));
      return;
    }
    const cleanPhone = customer.mobile.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
  };

  if (loading && !customer) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  if (!customer) return <View style={styles.centerContainer}><Text style={styles.errorText}>{t('customer_not_found', 'Customer not found.')}</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{customer.display_name}</Text>
        <Text style={styles.subtitle}>{customer.party_type}</Text>
        
        <View style={styles.infoRow}>
          <Building size={16} color={theme.colors.textMuted} style={styles.icon} />
          <Text style={styles.infoText}>{customer.billing_address || t('no_address', 'No address')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone size={16} color={theme.colors.textMuted} style={styles.icon} />
          <Text style={styles.infoText}>{customer.mobile || t('msg_no_phone', 'No phone')}</Text>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
            <Phone size={16} color="#fff" />
            <Text style={styles.actionBtnText}>{t('call', 'Call')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.success }]} onPress={handleWhatsApp}>
            <MessageSquare size={16} color="#fff" />
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: theme.colors.secondary }]} 
            onPress={() => navigation.navigate('AddFollowUp', { partyId: customer.id, partyName: customer.display_name })}
          >
            <Calendar size={16} color="#fff" />
            <Text style={styles.actionBtnText}>{t('follow_up', 'Follow-up')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('requirements', 'Requirements')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddRequirement', { partyId: customer.id, partyName: customer.display_name })}>
            <PlusCircle size={24} color={theme.colors.success} />
          </TouchableOpacity>
        </View>
        {requirements.length === 0 ? (
          <Text style={styles.emptyText}>{t('no_reqs', 'No requirements logged.')}</Text>
        ) : (
          requirements.map(req => (
            <Card key={req.id} style={styles.cardItem}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>{req.product_type}</Text>
                <Badge label={req.status} status={req.status === 'Open' ? 'warning' : 'neutral'} />
              </View>
              <Text style={styles.cardDetail}>{t('qty', 'Qty')}: {req.required_quantity} {req.unit}</Text>
            </Card>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dispatches', 'Dispatches')}</Text>
        {dispatches.length === 0 ? (
          <Text style={styles.emptyText}>{t('no_dispatches', 'No dispatches found.')}</Text>
        ) : (
          dispatches.map(disp => (
            <Card key={disp.id} style={styles.cardItem} onPress={() => navigation.navigate('UpdateDispatch', { dispatchId: disp.id })}>
              <View style={styles.cardRow}>
                <View>
                  <Text style={styles.cardTitle}>{disp.truck_number || t('no_truck', 'No Truck Info')}</Text>
                  <Text style={styles.cardDetail}>{new Date(disp.dispatch_date).toLocaleDateString()}</Text>
                </View>
                <Badge label={disp.status} status={disp.status === 'Dispatched' ? 'success' : 'neutral'} />
              </View>
              <Text style={styles.linkText}>{t('update_dispatch', 'Update Dispatch')}</Text>
            </Card>
          ))
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('active_followups', 'Active Follow-ups')}</Text>
        {followUps.length === 0 ? (
          <Text style={styles.emptyText}>{t('no_followups', 'No active follow-ups.')}</Text>
        ) : (
          followUps.map(fu => (
            <Card key={fu.id} style={styles.cardItem} onPress={() => navigation.navigate('LogFollowUp', { followUpId: fu.id, partyId: customer.id, partyName: customer.display_name, currentReason: fu.reason })}>
              <View style={styles.cardRow}>
                <View>
                  <Text style={styles.cardTitle}>{fu.reason}</Text>
                  <Text style={styles.cardDetail}>{new Date(fu.follow_up_date).toLocaleDateString()}</Text>
                </View>
                <Badge label={fu.priority} status={fu.priority === 'High' ? 'danger' : 'neutral'} />
              </View>
              <Text style={styles.linkText}>{t('complete_followup', 'Complete Follow-up')}</Text>
            </Card>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('recent_interactions', 'Recent Interactions')}</Text>
        {interactions.length === 0 ? (
          <Text style={styles.emptyText}>{t('no_interactions', 'No recent interactions.')}</Text>
        ) : (
          interactions.map((int) => (
            <View key={int.id} style={styles.timelineItem}>
              <View style={styles.timelineIcon}><CheckCircle size={14} color={theme.colors.primary} /></View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{int.interaction_type}</Text>
                <Text style={styles.timelineDate}>{new Date(int.created_at).toLocaleDateString()}</Text>
                {int.notes ? <Text style={styles.timelineNotes}>{int.notes}</Text> : null}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerContainer: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: theme.colors.danger, fontSize: theme.typography.sizes.lg },
  header: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderBottomWidth: theme.borders.width,
    borderBottomColor: theme.colors.border,
  },
  name: { fontSize: theme.typography.sizes.xxl, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.xs },
  subtitle: { fontSize: theme.typography.sizes.md, color: theme.colors.primary, marginBottom: theme.spacing.md, fontWeight: theme.typography.weights.bold },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm },
  icon: { marginRight: theme.spacing.sm },
  infoText: { color: theme.colors.textMuted, fontSize: theme.typography.sizes.md, flex: 1 },
  actionGrid: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  actionBtn: { flex: 1, backgroundColor: theme.colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: theme.spacing.sm, borderRadius: theme.borders.radius.md, gap: theme.spacing.sm },
  actionBtnText: { color: '#fff', fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.bold },
  section: { padding: theme.spacing.lg, paddingBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text, marginBottom: theme.spacing.md },
  emptyText: { color: theme.colors.textMuted, fontStyle: 'italic', marginBottom: theme.spacing.md },
  cardItem: { marginBottom: theme.spacing.md, padding: theme.spacing.md },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: theme.colors.text, fontWeight: theme.typography.weights.bold, fontSize: theme.typography.sizes.lg },
  cardDetail: { color: theme.colors.textMuted, fontSize: theme.typography.sizes.md, marginTop: theme.spacing.xs },
  linkText: { color: theme.colors.primary, fontSize: theme.typography.sizes.sm, fontWeight: theme.typography.weights.medium, marginTop: theme.spacing.md },
  timelineItem: { flexDirection: 'row', marginBottom: theme.spacing.md },
  timelineIcon: { width: 24, alignItems: 'center', paddingTop: 2, marginRight: theme.spacing.sm },
  timelineContent: { flex: 1, backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borders.radius.md, borderWidth: theme.borders.width, borderColor: theme.colors.border },
  timelineTitle: { color: theme.colors.text, fontWeight: theme.typography.weights.bold, fontSize: theme.typography.sizes.md },
  timelineDate: { color: theme.colors.textMuted, fontSize: theme.typography.sizes.sm, marginBottom: theme.spacing.xs },
  timelineNotes: { color: theme.colors.text, fontSize: theme.typography.sizes.md, marginTop: theme.spacing.xs },
});
