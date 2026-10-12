import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SLHeader } from '../../shared/components/SLHeader';
import { theme } from '../../shared/theme';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../core/api/supabase';
import { useTranslation } from '../../shared/localization/i18n';
import { 
  Settings, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Search, 
  X, 
  Check, 
  Layers, 
  Calendar,
  CircleAlert
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import MarketGraph from './components/MarketGraph';
import { 
  deduplicateAndSortPrices, 
  filterPricesByRange, 
  calculatePriceTrend, 
  getCommodityColor,
  formatCurrencyINR
} from './marketPriceService';

export default function MarketPricesScreen({ route }) {
  const { t, language } = useTranslation();
  const navigation = useNavigation();
  const { session } = useAuth();
  
  const [activeTab, setActiveTab] = useState(route?.params?.tab || 'today'); // 'today' | 'history'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [rawPrices, setRawPrices] = useState([]);
  const [historyRange, setHistoryRange] = useState('week'); // 'day', 'week', 'month', 'year'
  
  // Historical multi-select state
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [todaySearchQuery, setTodaySearchQuery] = useState('');
  const [focusedMaterialId, setFocusedMaterialId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Refetch when returning from Watchlist management screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData(false);
    });
    return unsubscribe;
  }, [navigation]);

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setFetchError(null);
    try {
      const uid = session?.user?.id;
      if (!uid) return;

      // 1. Get all active raw materials
      const { data: rmData, error: rmError } = await supabase
        .from('raw_materials')
        .select('id, name_en, name_hi, category')
        .eq('active', true)
        .order('name_en', { ascending: true });
        
      if (rmError) throw rmError;
      const allMaterials = rmData || [];
      setMaterials(allMaterials);
      
      // 2. Get user's custom watchlist
      const { data: wlData, error: wlError } = await supabase
        .from('dealer_market_watchlists')
        .select('raw_material_id')
        .eq('buyer_id', uid);
        
      if (wlError) throw wlError;
      const userWatchlistIds = (wlData || []).map(w => w.raw_material_id);
      setWatchlists(userWatchlistIds);

      // 3. Fetch all published market prices (limit 500)
      const { data: priceData, error: priceError } = await supabase
        .from('customer_published_prices')
        .select('id, raw_material_id, price, effective_date, unit, created_at')
        .eq('is_published', true)
        .order('effective_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);

      if (priceError) throw priceError;
      const fetchedPrices = priceData || [];
      setRawPrices(fetchedPrices);

      // Initialize selected materials for history if empty
      setSelectedMaterialIds(prev => {
        if (prev.length > 0) return prev;
        if (userWatchlistIds.length > 0) return userWatchlistIds;
        // Default to all materials that currently have published prices
        const materialsWithPrices = Array.from(new Set(fetchedPrices.map(p => p.raw_material_id)));
        return materialsWithPrices.length > 0 ? materialsWithPrices : allMaterials.map(m => m.id);
      });
      
    } catch (err) {
      console.error('Error fetching market prices:', err);
      setFetchError(err.message || 'Failed to load market prices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  // Commodities that have at least one published price
  const materialsWithPublishedPrices = useMemo(() => {
    const publishedIds = new Set(rawPrices.map(p => p.raw_material_id));
    return materials.filter(m => publishedIds.has(m.id));
  }, [materials, rawPrices]);

  // Clean deduplicated prices
  const deduplicatedPrices = useMemo(() => {
    return deduplicateAndSortPrices(rawPrices);
  }, [rawPrices]);

  // Filtered prices for the selected time range
  const rangeFilteredPrices = useMemo(() => {
    return filterPricesByRange(deduplicatedPrices, historyRange);
  }, [deduplicatedPrices, historyRange]);

  // Compute Today's Prices view data
  const todayPricesData = useMemo(() => {
    // If buyer has configured a watchlist, prioritize it; otherwise show all commodities with prices
    const displayMaterialIds = watchlists.length > 0 
      ? watchlists 
      : materialsWithPublishedPrices.map(m => m.id);

    return displayMaterialIds.map(rmId => {
      const material = materials.find(m => m.id === rmId);
      if (!material) return null;

      // Group and sort descending by effective_date then created_at
      const materialPrices = rawPrices
        .filter(p => p.raw_material_id === rmId)
        .sort((a, b) => {
          if (b.effective_date !== a.effective_date) {
            return b.effective_date.localeCompare(a.effective_date);
          }
          return (b.created_at || '').localeCompare(a.created_at || '');
        });

      const latest = materialPrices[0] || null;
      // Find a previous price on a DIFFERENT observation date for a true trend
      const previous = materialPrices.find(p => latest && p.effective_date < latest.effective_date) || null;
      const trend = calculatePriceTrend(latest, previous);

      return {
        material,
        latest,
        previous,
        trend
      };
    }).filter(Boolean);
  }, [watchlists, materialsWithPublishedPrices, materials, rawPrices]);

  // Filtered Today's prices based on search
  const filteredTodayData = useMemo(() => {
    if (!todaySearchQuery.trim()) return todayPricesData;
    const q = todaySearchQuery.toLowerCase();
    return todayPricesData.filter(item => {
      const nameEn = (item.material.name_en || '').toLowerCase();
      const nameHi = (item.material.name_hi || '').toLowerCase();
      const cat = (item.material.category || '').toLowerCase();
      return nameEn.includes(q) || nameHi.includes(q) || cat.includes(q);
    });
  }, [todayPricesData, todaySearchQuery]);

  // Historical products available for selection
  const selectableHistoricalMaterials = useMemo(() => {
    if (!productSearchQuery.trim()) return materialsWithPublishedPrices;
    const q = productSearchQuery.toLowerCase();
    return materialsWithPublishedPrices.filter(m => {
      const nameEn = (m.name_en || '').toLowerCase();
      const nameHi = (m.name_hi || '').toLowerCase();
      return nameEn.includes(q) || nameHi.includes(q);
    });
  }, [materialsWithPublishedPrices, productSearchQuery]);

  // Toggle single material selection for historical chart
  const toggleMaterialSelection = (materialId) => {
    setSelectedMaterialIds(prev => {
      if (prev.includes(materialId)) {
        const next = prev.filter(id => id !== materialId);
        // If the unselected item was the focused one, clear focus
        if (focusedMaterialId === materialId) {
          setFocusedMaterialId(null);
        }
        return next;
      } else {
        return [...prev, materialId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedMaterialIds(materialsWithPublishedPrices.map(m => m.id));
  };

  const handleClearAll = () => {
    setSelectedMaterialIds([]);
    setFocusedMaterialId(null);
  };

  // Historical records for table view (filtered by selected materials & time range, sorted descending)
  const historicalTableRecords = useMemo(() => {
    if (selectedMaterialIds.length === 0) return [];
    const selectedSet = new Set(selectedMaterialIds);

    return rangeFilteredPrices
      .filter(p => selectedSet.has(p.raw_material_id))
      .sort((a, b) => {
        if (b.effective_date !== a.effective_date) {
          return b.effective_date.localeCompare(a.effective_date);
        }
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
  }, [rangeFilteredPrices, selectedMaterialIds]);

  // ----------------------------------------------------
  // RENDER: TODAY'S PRICES TAB
  // ----------------------------------------------------
  const renderTodayPrices = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search & Watchlist Header */}
        <View style={styles.todayHeaderRow}>
          <View style={styles.searchBar}>
            <Search size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('market.searchPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              value={todaySearchQuery}
              onChangeText={setTodaySearchQuery}
            />
            {todaySearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setTodaySearchQuery('')}>
                <X size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.watchlistBtn}
            onPress={() => navigation.navigate('Watchlist', { watchlists, materials })}
            activeOpacity={0.8}
          >
            <Settings size={15} color={theme.colors.primary} />
            <Text style={styles.watchlistBtnText}>{t('market.editWatchlist')}</Text>
          </TouchableOpacity>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('market.latestPublished')}</Text>
          <Text style={styles.sectionSub}>
            {filteredTodayData.length} {t('market.allCommodities')}
          </Text>
        </View>

        {/* Price Cards List */}
        {filteredTodayData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{t('market.noHistoryFound')}</Text>
            {todaySearchQuery ? (
              <TouchableOpacity onPress={() => setTodaySearchQuery('')} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => navigation.navigate('Watchlist', { watchlists, materials })}
              >
                <Text style={styles.primaryButtonText}>{t('market.editWatchlist')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredTodayData.map((item, idx) => {
            const commodityColor = getCommodityColor(item.material.name_en, idx);
            const commodityName = language === 'hi' && item.material.name_hi 
              ? item.material.name_hi 
              : item.material.name_en;

            if (!item.latest) {
              return (
                <View key={item.material.id || idx} style={styles.priceCard}>
                  <View style={[styles.cardColorStrip, { backgroundColor: '#CBD5E1' }]} />
                  <View style={styles.cardContent}>
                    <View style={styles.priceHeader}>
                      <Text style={styles.materialName}>{commodityName}</Text>
                      {item.material.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{item.material.category}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.unavailableBox}>
                      <Text style={styles.unavailableText}>{t('market.pricePending')}</Text>
                    </View>
                  </View>
                </View>
              );
            }

            let formattedDate = item.latest.effective_date;
            try {
              formattedDate = format(parseISO(item.latest.effective_date), 'dd MMM yyyy');
            } catch (e) {}

            const unit = item.latest.unit || 'Quintal';
            const priceFormatted = formatCurrencyINR(item.latest.price);
            const trend = item.trend;

            return (
              <View key={item.material.id || idx} style={styles.priceCard}>
                <View style={[styles.cardColorStrip, { backgroundColor: commodityColor }]} />
                <View style={styles.cardContent}>
                  {/* Top: Name & Category */}
                  <View style={styles.priceHeader}>
                    <View style={styles.nameContainer}>
                      <Text style={styles.materialName} numberOfLines={1}>
                        {commodityName}
                      </Text>
                      <Text style={styles.dateText}>{formattedDate}</Text>
                    </View>
                    {item.material.category && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{item.material.category}</Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Bottom: Price and Reliable Trend */}
                  <View style={styles.priceBody}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceCurrency}>₹</Text>
                      <Text style={styles.priceValue}>{priceFormatted}</Text>
                      <Text style={styles.priceUnit}>/ {unit}</Text>
                    </View>
                    
                    {/* ONLY display trend badge when reliable previous price exists */}
                    {trend && trend.hasTrend && (
                      <View style={[styles.trendBadge, trend.isUp ? styles.trendUp : styles.trendDown]}>
                        {trend.isUp ? (
                          <TrendingUp size={13} color={theme.colors.success} style={{ marginRight: 3 }} />
                        ) : (
                          <TrendingDown size={13} color={theme.colors.error} style={{ marginRight: 3 }} />
                        )}
                        <Text style={[styles.trendText, { color: trend.isUp ? theme.colors.success : theme.colors.error }]}>
                          {trend.isUp ? '+' : ''}₹{Math.abs(trend.changeVal).toFixed(2)} ({trend.isUp ? '+' : ''}{trend.changePercent.toFixed(1)}%)
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  // ----------------------------------------------------
  // RENDER: HISTORICAL PRICES TAB
  // ----------------------------------------------------
  const renderHistory = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. TIME RANGE FILTER PILLS */}
        <View style={styles.timeFilterContainer}>
          {[
            { key: 'day', label: t('market.rangeDay') },
            { key: 'week', label: t('market.rangeWeek') },
            { key: 'month', label: t('market.rangeMonth') },
            { key: 'year', label: t('market.rangeYear') }
          ].map(r => (
            <TouchableOpacity 
              key={r.key} 
              style={[styles.rangePill, historyRange === r.key && styles.rangePillActive]}
              onPress={() => setHistoryRange(r.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.rangePillText, historyRange === r.key && styles.rangePillTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 2. SEARCHABLE MULTI-SELECT COMMODITY SELECTOR */}
        <View style={styles.selectorCard}>
          <View style={styles.selectorHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Layers size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.selectorTitle}>{t('market.commodity')}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {selectedMaterialIds.length} / {materialsWithPublishedPrices.length}
                </Text>
              </View>
            </View>
            
            <View style={styles.selectorActions}>
              <TouchableOpacity onPress={handleSelectAll} style={styles.actionLink}>
                <Text style={styles.actionLinkText}>{t('market.selectAll')}</Text>
              </TouchableOpacity>
              <Text style={styles.actionDivider}>|</Text>
              <TouchableOpacity onPress={handleClearAll} style={styles.actionLink}>
                <Text style={[styles.actionLinkText, { color: theme.colors.textMuted }]}>{t('market.clearAll')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar for Commodities */}
          <View style={styles.commoditySearchBar}>
            <Search size={14} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.commoditySearchInput}
              placeholder={t('market.searchPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              value={productSearchQuery}
              onChangeText={setProductSearchQuery}
            />
            {productSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setProductSearchQuery('')}>
                <X size={14} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Commodity Chips */}
          <View style={styles.chipsWrap}>
            {selectableHistoricalMaterials.map((m, idx) => {
              const isSelected = selectedMaterialIds.includes(m.id);
              const chipColor = getCommodityColor(m.name_en, idx);
              const displayName = language === 'hi' && m.name_hi ? m.name_hi : m.name_en;

              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.commodityChip,
                    isSelected && { borderColor: chipColor, backgroundColor: '#FFFFFF' }
                  ]}
                  onPress={() => toggleMaterialSelection(m.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.chipColorDot, { backgroundColor: chipColor }]} />
                  <Text style={[styles.chipText, isSelected && { fontWeight: '600', color: theme.colors.textPrimary }]}>
                    {displayName}
                  </Text>
                  {isSelected ? (
                    <View style={[styles.checkCircle, { backgroundColor: chipColor }]}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={styles.uncheckedCircle} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. HISTORICAL CHART */}
        {selectedMaterialIds.length === 0 ? (
          <View style={styles.noSelectionBox}>
            <CircleAlert size={28} color={theme.colors.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.noSelectionText}>{t('market.noCommoditiesSelected')}</Text>
            <TouchableOpacity onPress={handleSelectAll} style={styles.selectTopBtn}>
              <Text style={styles.selectTopBtnText}>{t('market.selectAll')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <MarketGraph 
            prices={rangeFilteredPrices} 
            materials={materials} 
            selectedIds={selectedMaterialIds}
            focusedId={focusedMaterialId}
            onSelectFocus={setFocusedMaterialId}
            range={historyRange} 
          />
        )}

        {/* 4. HISTORICAL RECORDS TABLE */}
        <View style={styles.historyTableCard}>
          <View style={styles.tableHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Calendar size={16} color={theme.colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.tableTitle}>{t('market.historicalRecords')}</Text>
            </View>
            <Text style={styles.tableCount}>
              ({historicalTableRecords.length})
            </Text>
          </View>

          {historicalTableRecords.length === 0 ? (
            <Text style={styles.noDataText}>{t('market.noHistoryFound')}</Text>
          ) : (
            <View style={styles.tableBody}>
              {/* Column Labels */}
              <View style={styles.tableColHeader}>
                <Text style={[styles.colLabel, { flex: 2 }]}>{t('market.commodity')}</Text>
                <Text style={[styles.colLabel, { flex: 1.5, textAlign: 'center' }]}>{t('market.date')}</Text>
                <Text style={[styles.colLabel, { flex: 2, textAlign: 'right' }]}>{t('market.price')}</Text>
              </View>

              {/* Rows */}
              {historicalTableRecords.slice(0, 50).map((record, i) => {
                const mat = materials.find(x => x.id === record.raw_material_id);
                const matName = language === 'hi' && mat?.name_hi ? mat.name_hi : (mat?.name_en || 'Commodity');
                const matColor = getCommodityColor(mat?.name_en || '');
                let obsDate = record.effective_date;
                try {
                  obsDate = format(parseISO(record.effective_date), 'dd MMM yyyy');
                } catch (e) {}

                return (
                  <View key={record.id || i} style={styles.historyTableRow}>
                    <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.tableColorDot, { backgroundColor: matColor }]} />
                      <Text style={styles.historyName} numberOfLines={1}>
                        {matName}
                      </Text>
                    </View>
                    <Text style={styles.historyDate}>{obsDate}</Text>
                    <View style={styles.historyPriceCol}>
                      <Text style={styles.historyPrice}>
                        ₹{formatCurrencyINR(record.price)}
                      </Text>
                      <Text style={styles.historyUnit}>/ {record.unit || 'Qtl'}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader 
        title={t('market.title')} 
        showBack={false}
        rightComponent={
          <TouchableOpacity onPress={onRefresh} style={{ padding: 8 }} activeOpacity={0.7}>
            <RefreshCw size={20} color={theme.colors.white} />
          </TouchableOpacity>
        }
      />
      
      {/* Top Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'today' && styles.tabActive]}
          onPress={() => setActiveTab('today')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
            {t('market.todaysPrices')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            {t('market.historicalPrices')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : fetchError ? (
        <View style={styles.errorContainer}>
          <CircleAlert size={36} color={theme.colors.error} style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>{t('market.loadErrorTitle')}</Text>
          <Text style={styles.errorSubtitle}>{t('market.loadErrorDesc')}</Text>
          <TouchableOpacity onPress={() => fetchData(true)} style={styles.retryButton} activeOpacity={0.8}>
            <RefreshCw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryButtonText}>{t('market.retry')}</Text>
          </TouchableOpacity>
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
  safeArea: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.background,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    ...theme.elevation.sm,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 120, // ensure floating buttons do not obscure content
  },

  // Today Header & Search
  todayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  watchlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: theme.radius.md,
  },
  watchlistBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    marginLeft: 5,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sectionSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },

  // Today Price Cards
  priceCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardColorStrip: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  priceBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginRight: 2,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  priceUnit: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendUp: {
    backgroundColor: '#E8F5E9',
  },
  trendDown: {
    backgroundColor: '#FFEBEE',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  unavailableBox: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  unavailableText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },

  // Time Range Filter Bar
  timeFilterContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 4,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  rangePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  rangePillActive: {
    backgroundColor: theme.colors.primary,
  },
  rangePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  rangePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Multi-select Commodity Selector Card
  selectorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  selectorActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLink: {
    paddingHorizontal: 4,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  actionDivider: {
    color: theme.colors.border,
    marginHorizontal: 4,
  },
  commoditySearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    height: 34,
    marginBottom: 10,
  },
  commoditySearchInput: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  commodityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginRight: 6,
  },
  checkCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckedCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  // No Selection Box
  noSelectionBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  noSelectionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  selectTopBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  selectTopBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Historical Records Table
  historyTableCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  tableCount: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  tableBody: {},
  tableColHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 4,
  },
  colLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  historyTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  historyName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  historyDate: {
    flex: 1.5,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  historyPriceCol: {
    flex: 2,
    alignItems: 'flex-end',
  },
  historyPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  historyUnit: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  noDataText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 18,
  },

  // Empty Container
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: '#F1F5F9',
  },
  resetBtnText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: theme.radius.sm,
  },
  primaryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
