import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../../core/api/supabase';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { Filter, Calendar as CalendarIcon, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../auth/AuthContext';

const UPDATE_TYPES = [
  'All', 'Price Update', 'Raw Material Update', 'Scheme', 'Reward', 
  'Offer', 'Product Update', 'Announcement', 'Supply Update', 'Important Notice', 'Other'
];

const DATE_FILTERS = [
  'Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range'
];

export default function BusinessUpdatesListScreen({ navigation }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedType, setSelectedType] = useState('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState('Last 30 Days');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchUpdates();
  }, [selectedType, selectedDateFilter]);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      // 1. Calculate date boundaries
      const now = new Date();
      let fromDate = null;
      let toDate = null;

      if (selectedDateFilter === 'Today') {
        fromDate = new Date(now.setHours(0,0,0,0));
      } else if (selectedDateFilter === 'Last 7 Days') {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 7);
      } else if (selectedDateFilter === 'Last 30 Days') {
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30);
      } else if (selectedDateFilter === 'This Month') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (selectedDateFilter === 'Last Month') {
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0);
      }

      // 2. Fetch updates based on RLS (which guarantees buyer isolation)
      let query = supabase.from('business_updates')
        .select(`
          id, title, message, type, published_at,
          business_update_recipients ( read_at )
        `)
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false });

      // In real scenario, type filtering might need to match exact enum string 
      // but let's use the display label for now if they are stored as such.
      // If type !== 'All', filter by type
      if (selectedType !== 'All') {
        query = query.eq('type', selectedType.toUpperCase().replace(/ /g, '_'));
      }

      if (fromDate) {
        query = query.gte('published_at', fromDate.toISOString());
      }
      if (toDate) {
        query = query.lte('published_at', toDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setUpdates(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.business_update_recipients || item.business_update_recipients.length === 0 || !item.business_update_recipients[0].read_at;
    const dateStr = new Date(item.published_at).toLocaleDateString();
    const timeStr = new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const displayType = item.type.replace(/_/g, ' ');

    return (
      <TouchableOpacity 
        style={[styles.card, isUnread && styles.unreadCard]}
        onPress={() => navigation.navigate('BusinessUpdateDetail', { updateId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            {isUnread && <View style={styles.unreadDot} />}
            <Text style={styles.typeText}>{displayType}</Text>
          </View>
          <Text style={styles.dateText}>{dateStr} • {timeStr}</Text>
        </View>
        <Text style={styles.titleText}>{item.title}</Text>
        <Text style={styles.summaryText} numberOfLines={2}>{item.message}</Text>
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => (
    <Modal visible={showFilterModal} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter Updates</Text>
          
          <Text style={styles.filterSectionTitle}>Type</Text>
          <View style={styles.chipContainer}>
            {UPDATE_TYPES.map(type => (
              <TouchableOpacity 
                key={type} 
                style={[styles.chip, selectedType === type && styles.chipActive]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[styles.chipText, selectedType === type && styles.chipTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.filterSectionTitle}>Date</Text>
          <View style={styles.chipContainer}>
            {DATE_FILTERS.map(filter => (
              <TouchableOpacity 
                key={filter} 
                style={[styles.chip, selectedDateFilter === filter && styles.chipActive]}
                onPress={() => setSelectedDateFilter(filter)}
              >
                <Text style={[styles.chipText, selectedDateFilter === filter && styles.chipTextActive]}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <SLHeader title="Business Updates" onBack={() => navigation.goBack()} />
      
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
          {['All', 'Price Update', 'Scheme', 'Reward'].map(type => (
            <TouchableOpacity 
              key={type} 
              style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[styles.filterChipText, selectedType === type && styles.filterChipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.filterIconBtn} onPress={() => setShowFilterModal(true)}>
          <Filter size={20} color={theme.colors.primary} />
          <Text style={styles.filterIconText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={updates}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No business updates found.</Text>
            </View>
          }
        />
      )}

      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  filterBar: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.sm, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderColor: theme.colors.border },
  typeScroll: { flex: 1 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.background, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipText: { ...theme.typography.bodyMedium, color: theme.colors.text },
  filterChipTextActive: { color: theme.colors.white },
  filterIconBtn: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.sm, marginLeft: theme.spacing.sm },
  filterIconText: { marginLeft: 4, color: theme.colors.primary, ...theme.typography.bodyMedium },
  listContent: { padding: theme.spacing.md },
  card: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radius.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginRight: 8 },
  typeText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: 'bold' },
  dateText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  titleText: { ...theme.typography.h3, marginBottom: theme.spacing.xs },
  summaryText: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', padding: theme.spacing.xl },
  emptyText: { ...theme.typography.bodyLarge, color: theme.colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg, padding: theme.spacing.lg },
  modalTitle: { ...theme.typography.h2, marginBottom: theme.spacing.lg },
  filterSectionTitle: { ...theme.typography.h3, marginBottom: theme.spacing.sm, marginTop: theme.spacing.md },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { ...theme.typography.bodyMedium, color: theme.colors.text },
  chipTextActive: { color: theme.colors.white },
  applyBtn: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: theme.radius.md, alignItems: 'center', marginTop: theme.spacing.xl },
  applyBtnText: { color: theme.colors.white, ...theme.typography.h3 }
});
