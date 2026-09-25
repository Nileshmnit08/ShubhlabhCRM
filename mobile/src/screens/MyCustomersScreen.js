import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Linking, TextInput } from 'react-native';
import { supabase } from '../lib/supabase';
import { Phone, Search, ChevronRight, User, MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import Card from '../components/Card';
import Badge from '../components/Badge';
import ScreenHeader from '../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MyCustomersScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const staffId = route?.params?.staffId;
  const staffName = route?.params?.staffName;

  const fetchMyCustomers = async (search = searchQuery) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;
      const effectiveStaffId = staffId || currentUserId;

      if (!effectiveStaffId) return;

      let query = supabase
        .from('crm_parties')
        .select('id, name:display_name, city, mobile, status:crm_status, is_priority, customer_code')
        .eq('assigned_owner_id', effectiveStaffId)
        .order('id', { ascending: false });

      if (search.trim()) {
        query = query.or(`display_name.ilike.%${search}%,mobile.ilike.%${search}%,customer_code.ilike.%${search}%`);
      } else {
        query = query.eq('is_priority', true);
      }

      const { data, error } = await query;
      if (error) console.error(error);
      else {
        setCustomers(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMyCustomers();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, staffId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyCustomers();
  };

  const initiateCall = (mobile) => {
    if (!mobile) {
      alert('No phone number available for this customer.');
      return;
    }
    Linking.openURL(`tel:${mobile}`);
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const renderItem = ({ item }) => {
    const isExpanded = expandedId === item.id;
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => toggleExpand(item.id)}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.nameRow}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
                {item.is_priority && (
                  <Badge label="PRIORITY" status="warning" style={{ marginRight: 6 }} />
                )}
                {item.status === 'Active' ? (
                  <Badge label="ACTIVE" status="success" />
                ) : (
                  <Badge label={(item.status || 'PENDING').toUpperCase()} status="neutral" />
                )}
              </View>
              <View style={styles.metaRow}>
                <MapPin size={14} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.itemSubtitle}>{item.city || t('no_city', 'No city')}</Text>
                {item.customer_code && (
                  <Text style={[styles.itemSubtitle, { marginLeft: 8 }]}>| {item.customer_code}</Text>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.cardFooter}>
            <View style={styles.contactInfo}>
              <User size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.contactText}>{item.mobile || 'No Contact'}</Text>
            </View>
            
            <TouchableOpacity style={styles.iconButton} onPress={() => initiateCall(item.mobile)}>
              <Phone color={theme.colors.onPrimaryContainer} size={18} />
            </TouchableOpacity>
          </View>

          {isExpanded && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddActivity', { partyId: item.id, partyName: item.name })}>
                <Text style={styles.actionBtnText}>Start Visit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddRequirement', { partyId: item.id, partyName: item.name })}>
                <Text style={styles.actionBtnText}>Add Order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddFollowUp', { partyId: item.id, partyName: item.name })}>
                <Text style={styles.actionBtnText}>Follow-up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}>
                <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>History</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title={staffName ? `Customers — ${staffName}` : "My Customers"} 
        showBack={!!staffId} 
        rightElement={
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{customers.length}</Text>
          </View>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search color={theme.colors.onSurfaceVariant} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search_customers', 'Search by name, mobile, or code...')}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.secondary} size="large" />
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Search size={48} color={theme.colors.outlineVariant} />
          <Text style={styles.emptyTitle}>{t('no_customers_found', 'No customers found')}</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? t('no_search_results', 'No matches for your search') : t('no_assigned_customers', 'You have no priority customers. Search to find others.')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: theme.spacing['screen-edge'], paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  countBadge: { backgroundColor: theme.colors.surfaceContainerHighest, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borders.radius.full },
  countText: { fontSize: theme.typography.sizes.labelSm, fontWeight: theme.typography.weights.semibold, color: theme.colors.secondary },

  searchContainer: {
    paddingHorizontal: theme.spacing['screen-edge'],
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLowest,
    height: 48,
    borderRadius: theme.borders.radius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    height: 48,
    fontSize: theme.typography.sizes.bodyMd,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onSurface,
  },

  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  headerLeft: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  
  itemTitle: { flex: 1, color: theme.colors.onSurface, fontSize: theme.typography.sizes.titleMd, fontWeight: theme.typography.weights.bold, marginRight: 8 },
  itemSubtitle: { color: theme.colors.onSurfaceVariant, fontSize: theme.typography.sizes.bodySm, marginLeft: 4 },
  
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceContainerLow,
    marginHorizontal: -theme.spacing.md,
    marginBottom: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomLeftRadius: theme.borders.radius.md,
    borderBottomRightRadius: theme.borders.radius.md,
  },
  contactInfo: { flexDirection: 'row', alignItems: 'center' },
  contactText: { marginLeft: 6, fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSurfaceVariant, fontWeight: theme.typography.weights.semibold },
  
  iconButton: { 
    width: 36,
    height: 36,
    backgroundColor: theme.colors.surfaceContainerLowest, 
    borderRadius: theme.borders.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm
  },

  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceContainerHigh,
  },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borders.radius.sm,
    flex: 1,
    alignItems: 'center',
    minWidth: '45%',
  },
  actionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: theme.typography.sizes.labelMd,
    fontWeight: theme.typography.weights.semibold,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  emptyTitle: { fontSize: theme.typography.sizes.titleMd, fontWeight: theme.typography.weights.bold, color: theme.colors.onSurface, marginTop: theme.spacing.md },
  emptySubtext: { fontSize: theme.typography.sizes.bodySm, color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.xs, textAlign: 'center' }
});
