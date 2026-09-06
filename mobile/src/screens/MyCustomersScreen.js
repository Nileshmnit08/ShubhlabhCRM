import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Linking, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Phone, Plus, Search, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Input from '../components/Input';
import Button from '../components/Button';

export default function MyCustomersScreen({ navigation }) {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMyCustomers = async () => {
    try {
      // Postgres RLS automatically filters rows to those assigned to the logged-in user 
      // or available due to roles.
      const { data, error } = await supabase
        .from('v_customer_360')
        .select('id:customer_id, name:crm_display_name, city:crm_city, mobile:crm_mobile')
        .eq('crm_status', 'Active')
        .order('customer_id', { ascending: false });

      if (error) console.error(error);
      else {
        setCustomers(data || []);
        setFilteredCustomers(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyCustomers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyCustomers();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text) {
      setFilteredCustomers(customers);
    } else {
      const lower = text.toLowerCase();
      setFilteredCustomers(customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(lower)) || 
        (c.city && c.city.toLowerCase().includes(lower)) ||
        (c.mobile && c.mobile.includes(lower))
      ));
    }
  };

  const initiateCall = (mobile) => {
    if (!mobile) {
      Alert.alert(t('error_no_phone', 'No Phone'), t('msg_no_phone', 'No phone number available for this customer.'));
      return;
    }
    Linking.openURL(`tel:${mobile}`);
  };

  const renderItem = ({ item }) => (
    <Card 
      style={styles.card}
      onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={{flex: 1}}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>{item.city || t('no_city', 'No city')}</Text>
        </View>
        <ChevronRight color={theme.colors.textMuted} size={20} />
      </View>
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.iconButton} onPress={() => initiateCall(item.mobile)}>
          <Phone color={theme.colors.primary} size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('AddRequirement', { partyId: item.id })}>
          <Plus color={theme.colors.success} size={20} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Input
          placeholder={t('search_customers', 'Search customers...')}
          value={searchQuery}
          onChangeText={handleSearch}
          icon={<Search color={theme.colors.textMuted} size={20} />}
          containerStyle={{ marginBottom: 0 }}
        />
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing.lg }} />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState 
          icon={<Search size={48} color={theme.colors.textMuted} />}
          title={t('no_customers_found', 'No customers found')}
          message={searchQuery ? t('no_search_results', 'No matches for your search') : t('no_assigned_customers', 'You have no active customers assigned')}
          actionLabel={t('refresh', 'Refresh')}
          onAction={onRefresh}
        />
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: theme.spacing.md, paddingTop: 0 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchContainer: {
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    borderTopWidth: theme.borders.width,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  itemTitle: { color: theme.colors.text, fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold },
  itemSubtitle: { color: theme.colors.textMuted, fontSize: theme.typography.sizes.md, marginTop: theme.spacing.xs },
  iconButton: { 
    padding: theme.spacing.sm, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: theme.borders.radius.full,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border
  },
});
