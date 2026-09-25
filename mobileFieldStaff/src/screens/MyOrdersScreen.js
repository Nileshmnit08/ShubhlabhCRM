import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, elevation } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { supabase } from '../lib/supabase';
import { SyncService } from '../services/SyncService';
import { EmptyState } from '../components';

import { useFocusEffect } from '@react-navigation/native';

export function MyOrdersScreen({ navigation }) {
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${String(d.getFullYear()).substring(2)}`;
  };

  const [activeFilter, setActiveFilter] = useState('Today');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { session } = useAuth();
  const { isSyncing } = useSync();
  const [pendingOperations, setPendingOperations] = useState([]);

  useEffect(() => {
    if (session?.user?.id) {
      SyncService.getQueue(session.user.id).then(q => setPendingOperations(q || []));
    }
  }, [session?.user?.id, isSyncing]);

  const fetchOrders = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('requirements')
        .select(`
          *,
          crm_parties (
            display_name
          ),
          requirement_items (*)
        `)
        .eq('assigned_to', session.user.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        // We don't overlay the queue here because we want to do it synchronously
        // inside the component render or derived state so it updates immediately when queue changes.
        setOrders(data);
        await AsyncStorage.setItem('@my_orders_cache', JSON.stringify(data));
      } else {
        await loadCached();
      }
    } catch (err) {
      await loadCached();
    } finally {
      setIsLoading(false);
    }
  };

  // Derived state to overlay queue on orders
  const mergedOrders = React.useMemo(() => {
    return orders.map(serverOrder => {
      let activeOrder = { ...serverOrder };
      
      const reqOps = pendingOperations.filter(op => op.table === 'requirements' && op.payload?.id === serverOrder.id && ['PENDING','FAILED','SYNCING'].includes(op.status));
      reqOps.forEach(op => {
         if (op.action === 'update' || op.action === 'upsert') {
            activeOrder = { ...activeOrder, ...op.payload };
         }
      });

      const itemOps = pendingOperations.filter(op => op.table === 'requirement_items' && op.payload?.requirement_id === serverOrder.id && ['PENDING','FAILED','SYNCING'].includes(op.status));
      if (itemOps.length > 0) {
         let mergedItems = [...(activeOrder.requirement_items || [])];
         itemOps.forEach(op => {
            if (op.action === 'delete') {
               mergedItems = mergedItems.filter(i => i.id !== op.payload.id);
            } else if (op.action === 'update' || op.action === 'upsert' || op.action === 'insert') {
               const existingIdx = mergedItems.findIndex(i => i.id === op.payload.id);
               if (existingIdx >= 0) {
                  mergedItems[existingIdx] = { ...mergedItems[existingIdx], ...op.payload };
               } else {
                  mergedItems.push(op.payload);
               }
            }
         });
         activeOrder.requirement_items = mergedItems;
      }
      
      return activeOrder;
    });
  }, [orders, pendingOperations]);

  const loadCached = async () => {
    try {
      const cached = await AsyncStorage.getItem('@my_orders_cache');
      if (cached) setOrders(JSON.parse(cached));
    } catch (e) {
      console.warn("Failed to load cached orders");
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [session?.user?.id])
  );

  const getSyncState = (orderId) => {
    const pendingOp = pendingOperations.find(op => op.table === 'requirements' && (op.payload?.id === orderId || op.local_id === orderId));
    if (!pendingOp) return { status: 'synced', text: '✓ Synced', color: '#1b5e20', bgColor: '#d3ebd3' };
    if (pendingOp.status === 'FAILED') return { status: 'failed', text: '⚠ Sync Failed', color: '#93000a', bgColor: '#ffdad6' };
    return { status: 'pending', text: '⏳ Pending Sync', color: '#904d00', bgColor: '#ffead1' };
  };

  const filteredOrders = mergedOrders.filter(order => {
    let dateMatch = true;
    const orderDate = new Date(order.created_at || order.expected_date || new Date());
    const today = new Date();
    
    if (activeFilter === 'Today') {
      dateMatch = orderDate.toDateString() === today.toDateString();
    } else if (activeFilter === 'This Week') {
      const diff = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
      const startOfWeek = new Date(today.setDate(diff));
      startOfWeek.setHours(0,0,0,0);
      dateMatch = orderDate >= startOfWeek;
    } else if (activeFilter === 'This Month') {
      dateMatch = orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
    }

    if (!dateMatch) return false;
    if (!searchQuery) return true;

    const sq = searchQuery.toLowerCase();
    const customerMatch = (order.crm_parties?.display_name || '').toLowerCase().includes(sq);
    const refMatch = (order.demand_ref || order.id || '').toLowerCase().includes(sq);
    const productMatch = (order.requirement_items || []).some(item => 
      (item.product_name || '').toLowerCase().includes(sq) || 
      (item.category || '').toLowerCase().includes(sq)
    );
    return customerMatch || refMatch || productMatch;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer, ref, or product..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {['Today', 'This Week', 'This Month', 'All'].map(filter => (
            <TouchableOpacity 
              key={filter} 
              style={activeFilter === filter ? styles.filterActive : styles.filterInactive}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={activeFilter === filter ? styles.filterTextActive : styles.filterTextInactive}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.listContainer}>
          {isLoading ? (
             <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 40}} />
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const items = order.requirement_items || [];
              const syncState = getSyncState(order.id);
              const orderRef = order.demand_ref || order.id.substring(0,8).toUpperCase();
              
              return (
                <TouchableOpacity 
                  key={order.id} 
                  style={styles.orderCard}
                  onPress={() => navigation.navigate('OrderDetail', { orderId: order.id, orderData: order })}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.customerName} numberOfLines={1}>{order.crm_parties?.display_name || 'Unknown Customer'}</Text>
                    <View style={[styles.syncBadge, {backgroundColor: syncState.bgColor}]}>
                      <Text style={[styles.syncText, {color: syncState.color}]}>{syncState.text}</Text>
                    </View>
                  </View>
                  <Text style={styles.orderRef}>Order #{orderRef}</Text>
                  
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{formatDate(order.created_at || order.expected_date)}</Text>
                    <Text style={styles.metaDivider}>•</Text>
                    <Text style={styles.metaText}>{items.length} Product{items.length !== 1 ? 's' : ''}</Text>
                    <Text style={styles.metaDivider}>•</Text>
                    <View style={[styles.statusBadge, {backgroundColor: order.status === 'New' ? '#dce9ff' : '#f0f0f0'}]}>
                      <Text style={[styles.statusText, {color: order.status === 'New' ? colors.primary : colors.onSurfaceVariant}]}>{order.status}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.activityMetaRow}>
                    {items.slice(0, 3).map((item, idx) => (
                      <View key={idx} style={styles.metaChip}>
                        <Text style={[styles.metaChipText, {fontWeight: 'bold', color: colors.primary}]}>{item.product_name}</Text>
                        <Text style={styles.metaChipText}>{item.quantity} {item.unit}</Text>
                      </View>
                    ))}
                    {items.length > 3 && (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>+{items.length - 3} more</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })
          ) : (
            <EmptyState 
              title="No Orders Found" 
              message={`You have no orders matching your criteria.`} 
              icon="shopping-cart" 
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#ffffff', elevation: 2 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontWeight: 'bold', marginLeft: 8 },
  searchHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerHighest, borderRadius: 12, paddingHorizontal: 12, height: 48 },
  searchInput: { flex: 1, marginLeft: 8, ...typography.bodyLg, color: colors.onSurface },
  searchIcon: { marginRight: 8 },
  container: { padding: 16, paddingBottom: 100 },
  filtersScroll: { marginBottom: 16, flexGrow: 0 },
  filterActive: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  filterInactive: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.outlineVariant },
  filterTextActive: { ...typography.labelMd, color: colors.onPrimary },
  filterTextInactive: { ...typography.labelMd, color: colors.onSurface },
  listContainer: { marginTop: 8 },
  
  orderCard: { flexDirection: 'column', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  customerName: { ...typography.titleMd, fontWeight: 'bold', color: colors.onSurface, flex: 1, marginRight: 8 },
  orderRef: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: 12, fontWeight: 'bold' },
  syncBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  syncText: { ...typography.labelSm, fontSize: 10, fontWeight: 'bold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  metaText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  metaDivider: { marginHorizontal: 8, color: colors.outline },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  statusText: { ...typography.labelMd, fontWeight: 'bold' },
  
  activityMetaRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  metaChip: { backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#eeeeee' },
  metaChipText: { ...typography.labelMd, color: colors.onSurfaceVariant },
});
