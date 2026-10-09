import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SLHeader } from '../../shared/components/SLHeader';
import { theme } from '../../shared/theme';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../core/api/supabase';
import { useTranslation } from '../../shared/localization/i18n';
import { Settings, RefreshCw, TrendingUp } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import MarketGraph from './components/MarketGraph';

export default function MarketPricesScreen() {
  const { t, language } = useTranslation();
  const navigation = useNavigation();
  const { session } = useAuth();
  
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'history'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [prices, setPrices] = useState([]);
  const [historyRange, setHistoryRange] = useState('week'); // 'day', 'week', 'month', 'year'

  useEffect(() => {
    fetchData();
  }, [historyRange]);

  // Make sure we refetch when coming back from watchlist edit
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData(false);
    });
    return unsubscribe;
  }, [navigation, historyRange]);

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const uid = session?.user?.id;
      if (!uid) return;

      // 1. Get raw materials
      const { data: rmData, error: rmError } = await supabase
        .from('raw_materials')
        .select('id, name_en, name_hi, category')
        .eq('active', true);
        
      if (rmError) throw rmError;
      
      // 2. Get user's watchlist
      const { data: wlData, error: wlError } = await supabase
        .from('dealer_market_watchlists')
        .select('raw_material_id')
        .eq('buyer_id', uid);
        
      if (wlError) throw wlError;

      const watchlistedIds = wlData.map(w => w.raw_material_id);
      
      setMaterials(rmData || []);
      setWatchlists(watchlistedIds);

      // If no watchlist, stop loading prices
      if (watchlistedIds.length === 0) {
        setPrices([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 3. Get Prices depending on tab/historyRange
      // We will fetch up to 300 entries for the watchlisted items and sort them by entry_date
      let query = supabase
        .from('raw_material_price_entries')
        .select('id, raw_material_id, price, entry_date, created_at, rm_units(unit_name)')
        .in('raw_material_id', watchlistedIds)
        .eq('is_deleted', false)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply date filter based on historyRange
      const d = new Date();
      if (historyRange === 'day') {
        d.setDate(d.getDate() - 1);
      } else if (historyRange === 'week') {
        d.setDate(d.getDate() - 7);
      } else if (historyRange === 'month') {
        d.setDate(d.getDate() - 30);
      } else if (historyRange === 'year') {
        d.setDate(d.getDate() - 365);
      }
      query = query.gte('entry_date', d.toISOString().split('T')[0]);

      const { data: priceData, error: priceError } = await query.limit(500);
      if (priceError) throw priceError;

      setPrices(priceData || []);
      
    } catch (err) {
      console.error('Error fetching market prices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  // Compute Today's Prices view data
  // Only taking the very latest price per material
  const getTodayPrices = () => {
    if (!watchlists || watchlists.length === 0) return [];
    
    return watchlists.map(rmId => {
      const material = materials.find(m => m.id === rmId);
      const materialPrices = prices.filter(p => p.raw_material_id === rmId);
      
      // Since they are ordered by entry_date DESC, created_at DESC, index 0 is latest
      const latest = materialPrices[0];
      const previous = materialPrices[1]; // for trend
      
      return {
        material,
        latest,
        previous
      };
    }).filter(item => item.material);
  };

  const renderTodayPrices = () => {
    if (watchlists.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('profile.language') === 'Language' ? 'No Materials Selected' : 'कोई सामग्री नहीं चुनी गई'}</Text>
          <Text style={styles.emptyText}>{t('profile.language') === 'Language' ? 'Tap Edit Watchlist to track market prices.' : 'बाज़ार भाव ट्रैक करने के लिए वॉचलिस्ट संपादित करें पर टैप करें।'}</Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Watchlist', { watchlists, materials })}
          >
            <Text style={styles.primaryButtonText}>{t('profile.language') === 'Language' ? 'Edit Watchlist' : 'वॉचलिस्ट संपादित करें'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const data = getTodayPrices();

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('profile.language') === 'Language' ? 'Latest Published Prices' : 'नवीनतम प्रकाशित कीमतें'}</Text>
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => navigation.navigate('Watchlist', { watchlists, materials })}
          >
            <Settings size={16} color={theme.colors.primary} />
            <Text style={styles.editBtnText}>{t('profile.language') === 'Language' ? 'Edit' : 'संपादित करें'}</Text>
          </TouchableOpacity>
        </View>

        {data.map((item, idx) => {
          if (!item.latest) {
            return (
              <View key={idx} style={styles.priceCard}>
                <View style={styles.priceHeader}>
                  <Text style={styles.materialName}>{language === 'hi' && item.material.name_hi ? item.material.name_hi : item.material.name_en}</Text>
                </View>
                <View style={styles.unavailableBox}>
                  <Text style={styles.unavailableText}>Price not published yet</Text>
                </View>
              </View>
            );
          }

          let formattedDate = '';
          try {
            formattedDate = format(parseISO(item.latest.entry_date), 'dd MMM yyyy');
          } catch(e) {}

          const unit = item.latest.rm_units?.unit_name || 'Unit';
          
          let changeVal = 0;
          let changePercent = 0;
          let isUp = null;
          
          if (item.previous && item.previous.price > 0) {
            changeVal = Number(item.latest.price) - Number(item.previous.price);
            changePercent = (changeVal / Number(item.previous.price)) * 100;
            if (changeVal > 0) isUp = true;
            else if (changeVal < 0) isUp = false;
          }

          return (
            <View key={idx} style={styles.priceCard}>
              <View style={styles.priceHeader}>
                <Text style={styles.materialName}>{language === 'hi' && item.material.name_hi ? item.material.name_hi : item.material.name_en}</Text>
                <Text style={styles.dateText}>{formattedDate}</Text>
              </View>
              
              <View style={styles.priceBody}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceValue}>₹{Number(item.latest.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                  <Text style={styles.priceUnit}>/ {unit}</Text>
                </View>
                
                {isUp !== null && (
                  <View style={[styles.trendBadge, isUp ? styles.trendUp : styles.trendDown]}>
                    <TrendingUp size={14} color={isUp ? theme.colors.success : theme.colors.alert} style={!isUp ? {transform: [{rotate: '180deg'}]} : {}} />
                    <Text style={[styles.trendText, {color: isUp ? theme.colors.success : theme.colors.alert}]}>
                      {Math.abs(changeVal).toLocaleString('en-IN', {minimumFractionDigits: 2})} ({Math.abs(changePercent).toFixed(1)}%)
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderHistory = () => {
    if (watchlists.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('profile.language') === 'Language' ? 'No Materials Selected' : 'कोई सामग्री नहीं चुनी गई'}</Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Watchlist', { watchlists, materials })}
          >
            <Text style={styles.primaryButtonText}>{t('profile.language') === 'Language' ? 'Edit Watchlist' : 'वॉचलिस्ट संपादित करें'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{flex: 1}}>
        <View style={styles.filterRow}>
          {['day', 'week', 'month', 'year'].map(r => (
            <TouchableOpacity 
              key={r} 
              style={[styles.filterChip, historyRange === r && styles.filterChipActive]}
              onPress={() => setHistoryRange(r)}
            >
              <Text style={[styles.filterChipText, historyRange === r && styles.filterChipTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <MarketGraph prices={prices} materials={materials} watchlists={watchlists} range={historyRange} />
          
          <View style={styles.historyTableBox}>
            <Text style={styles.tableTitle}>{t('profile.language') === 'Language' ? 'Historical Data' : 'ऐतिहासिक डेटा'}</Text>
            {prices.length === 0 ? (
               <Text style={styles.noDataText}>No history available for this range.</Text>
            ) : (
               prices.slice(0, 50).map((p, i) => {
                 const m = materials.find(x => x.id === p.raw_material_id);
                 return (
                   <View key={i} style={styles.historyTableRow}>
                     <View>
                       <Text style={styles.historyName}>{language === 'hi' && m?.name_hi ? m.name_hi : m?.name_en}</Text>
                       <Text style={styles.historyDate}>{p.entry_date}</Text>
                     </View>
                     <Text style={styles.historyPrice}>₹{Number(p.price).toFixed(2)} / {p.rm_units?.unit_name || ''}</Text>
                   </View>
                 );
               })
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader 
        title={t('profile.language') === 'Language' ? 'Market Prices' : 'बाज़ार भाव'} 
        showBack={false}
        rightComponent={
          <TouchableOpacity onPress={onRefresh} style={{padding: 8}}>
            <RefreshCw size={20} color={theme.colors.white} />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
            {t('profile.language') === 'Language' ? "Today's Prices" : 'आज की कीमतें'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            {t('profile.language') === 'Language' ? "Historical Prices" : 'ऐतिहासिक कीमतें'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === 'today' ? renderTodayPrices() : renderHistory()}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editBtnText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  priceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  materialName: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  dateText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  priceBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  priceUnit: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendUp: {
    backgroundColor: '#E8F5E9',
  },
  trendDown: {
    backgroundColor: '#FFEBEE',
  },
  trendText: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    marginLeft: 4,
  },
  unavailableBox: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  unavailableText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  primaryButtonText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.white,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: '#FFF3E0',
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  historyTableBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tableTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.md,
  },
  historyTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  historyName: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  historyDate: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  historyPrice: {
    ...theme.typography.bodyLarge,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  noDataText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  }
});
