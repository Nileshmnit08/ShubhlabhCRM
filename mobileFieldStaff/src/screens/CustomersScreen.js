import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { CustomerCard, FAB, EmptyState, Button, Tabs } from '../components';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function CustomersScreen({ navigation }) {
  const { t } = useTranslation();
  const { staffProfile } = useAuth();
  
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filterTabs = [
    { id: 'all', label: 'All 42' },
    { id: 'near_me', label: 'Near Me', icon: 'near-me' },
    { id: 'overdue', label: 'Overdue', badge: '3' },
    { id: 'active', label: 'Active' },
    { id: 'prospects', label: 'Prospects' }
  ];

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, err } = await supabase
        .from('crm_parties')
        .select('id, name:display_name, city, mobile, status:crm_status')
        .eq('assigned_owner_id', staffProfile.id)
        .order('id', { ascending: false });

      if (err) throw err;
      
      setCustomers(data || []);
      setFilteredCustomers(data || []);
      await AsyncStorage.setItem('@customers_cache', JSON.stringify(data || []));
    } catch (err) {
      console.error(err);
      await loadCachedCustomers();
    } finally {
      setLoading(false);
    }
  };

  const loadCachedCustomers = async () => {
    try {
      const cached = await AsyncStorage.getItem('@customers_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        setCustomers(parsed);
        setFilteredCustomers(parsed);
      } else {
        setError('Failed to fetch customers and no offline data available.');
      }
    } catch (e) {
      setError('Failed to fetch customers');
    }
  };

  useEffect(() => {
    if (staffProfile?.id) fetchCustomers();
  }, [staffProfile?.id]);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.centerSafe}>
        <EmptyState title={t('customers.loading')} message="" icon="sync" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerSafe}>
        <EmptyState title={t('customers.error')} message={error} icon="error-outline" />
        <View style={{ marginTop: 16 }}>
          <Button title={t('customers.retry')} onPress={fetchCustomers} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={typography.headlineLgMobile}>Customers (ग्राहक)</Text>
        <View style={styles.headerIcons}>
          <MaterialIcons name="notifications" size={24} color={colors.onSurfaceVariant} style={{ marginRight: 16 }} />
          <MaterialIcons name="account-circle" size={24} color={colors.primary} />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={24} color={colors.onSurfaceVariant} />
          <TextInput 
            style={styles.searchInput} 
            placeholder={t('customers.search')} 
            placeholderTextColor={colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity style={styles.micBtn}>
            <MaterialIcons name="mic" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <Tabs tabs={filterTabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Location Context */}
      <View style={styles.locationContext}>
        <MaterialIcons name="my-location" size={16} color={colors.onSurfaceVariant} />
        <Text style={styles.locationText}>Loha Mandi, Beat Sector 4</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.locationCount}>8 clients within 2.5 km</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {filteredCustomers.length === 0 ? (
          <EmptyState 
            title={t('customers.noCustomersFound')} 
            message={t('customers.noCustomersMessage')} 
            icon="people-outline" 
          />
        ) : (
          filteredCustomers.map(c => {
            const loc = c.city || t('customers.profile.addressNotAvailable');
            const statusLabel = c.status || 'PENDING';
            return (
              <CustomerCard 
                key={c.id}
                name={c.name || 'Unknown Customer'}
                location={loc}
                statusType={statusLabel.toUpperCase()}
                dues={c.mobile || t('customers.profile.phoneNotAvailable')}
                onPress={() => navigation.navigate('CustomerProfile', { id: c.id, customerName: c.name })}
              />
            );
          })
        )}
      </ScrollView>

      <FAB icon="add" onPress={() => navigation.navigate('AddCustomer')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centerSafe: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  searchHeader: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerHighest, borderRadius: rounded.default, paddingHorizontal: 12, height: 48 },
  searchInput: { flex: 1, marginLeft: 8, ...typography.bodyLg, color: colors.onSurface },
  micBtn: { padding: 4 },
  locationContext: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  locationText: { ...typography.labelSm, color: colors.onSurfaceVariant, marginLeft: 4, fontWeight: 'bold' },
  locationCount: { ...typography.labelSm, color: colors.onSurfaceVariant },
  container: { padding: 16, paddingBottom: 100 }
});
