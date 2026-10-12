import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { theme } from '../../../shared/theme';
import { useTranslation } from '../../../shared/localization/i18n';
import { 
  prepareChartData, 
  detectScaleCompatibility, 
  getCommodityColor,
  formatCurrencyINR
} from '../marketPriceService';
import { CircleAlert, Eye, Info, Calendar, TrendingUp } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export default function MarketGraph({ 
  prices = [], 
  materials = [], 
  selectedIds = [], 
  focusedId = null,
  onSelectFocus = () => {},
  range = 'week' 
}) {
  const { t, language } = useTranslation();
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Determine which IDs to plot: if focusedId is provided, plot only that one
  const activePlotIds = useMemo(() => {
    if (focusedId) return [focusedId];
    return selectedIds;
  }, [focusedId, selectedIds]);

  const chartPayload = useMemo(() => {
    return prepareChartData(prices, activePlotIds, materials);
  }, [prices, activePlotIds, materials]);

  const scaleCheck = useMemo(() => {
    if (!chartPayload || activePlotIds.length <= 1) return { isScaleDisparate: false, maxRatio: 1 };
    return detectScaleCompatibility(chartPayload.datasets);
  }, [chartPayload, activePlotIds]);

  // Case C: No historical records found
  if (!chartPayload || chartPayload.datasets.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Info size={28} color={theme.colors.textMuted} style={{ marginBottom: 8 }} />
        <Text style={styles.emptyTitle}>
          {t('market.notEnoughDataTitle')}
        </Text>
        <Text style={styles.emptySubtitle}>
          {t('market.notEnoughDataDesc')}
        </Text>
      </View>
    );
  }

  // Case B: Handle single data point case (chart-kit requires >= 2 points for a line trend)
  const isSinglePoint = chartPayload.sortedDates.length === 1;

  if (isSinglePoint) {
    const singleDate = chartPayload.sortedDates[0];
    let formattedSingleDate = singleDate;
    try {
      formattedSingleDate = format(parseISO(singleDate), 'dd MMM yyyy');
    } catch (e) {}

    return (
      <View style={styles.singlePointContainer}>
        {/* Top: Date and Observation Badge */}
        <View style={styles.singlePointTopRow}>
          <View style={styles.singlePointDateBadge}>
            <Calendar size={13} color={theme.colors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.singlePointDateText}>{formattedSingleDate}</Text>
          </View>
          <View style={styles.recordedPill}>
            <Text style={styles.recordedPillText}>{t('market.oneDateRecorded')}</Text>
          </View>
        </View>

        {/* Informational Callout Banner */}
        <View style={styles.singlePointNoticeBox}>
          <TrendingUp size={16} color="#D97706" style={{ marginRight: 8, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.singlePointNoticeTitle}>
              {t('market.historicalTrendPending')}
            </Text>
            <Text style={styles.singlePointNoticeDesc}>
              {t('market.singleObservationDesc')}
            </Text>
          </View>
        </View>

        {/* Selected Commodity Latest Price Summary Cards */}
        <Text style={styles.singlePointSectionLabel}>
          {t('market.singleObservationHeader')} ({chartPayload.productsMeta.length})
        </Text>
        <View style={styles.singlePointList}>
          {chartPayload.productsMeta.map((p, idx) => {
            const isCurrentFocus = focusedId === p.id;
            return (
              <TouchableOpacity
                key={p.id || idx}
                style={[
                  styles.singlePointRow,
                  { borderLeftColor: p.color },
                  isCurrentFocus && styles.singlePointRowFocused
                ]}
                onPress={() => {
                  if (focusedId === p.id) {
                    onSelectFocus(null);
                  } else {
                    onSelectFocus(p.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.legendColorRow}>
                  <View style={[styles.colorDot, { backgroundColor: p.color }]} />
                  <View>
                    <Text style={styles.singlePointName}>
                      {language === 'hi' && p.name_hi ? p.name_hi : p.name_en}
                    </Text>
                    <Text style={styles.singlePointDateSub}>{formattedSingleDate}</Text>
                  </View>
                </View>
                <Text style={styles.singlePointPrice}>
                  ₹{formatCurrencyINR(p.latestPrice, false)} / {p.unit}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }


  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 14,
    },
    propsForDots: {
      r: chartPayload.sortedDates.length > 20 ? '2' : '4',
      strokeWidth: '2',
      stroke: theme.colors.surface,
    },
    propsForBackgroundLines: {
      strokeDasharray: '4',
      stroke: '#E2E8F0',
      strokeWidth: 1,
    }
  };

  return (
    <View style={styles.container}>
      {/* Scale Disparity Warning Banner */}
      {scaleCheck.isScaleDisparate && !focusedId && (
        <View style={styles.disparityBanner}>
          <CircleAlert size={18} color="#D97706" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.disparityTitle}>
              {t('profile.language') === 'Language' ? 'Wide Price Difference Detected' : 'बड़ा मूल्य अंतर पाया गया'}
            </Text>
            <Text style={styles.disparityDesc}>
              {t('profile.language') === 'Language' 
                ? 'Selected commodities have very different price ranges. Tap a commodity in the legend below to focus on its individual trend.'
                : 'चयनित सामग्रियों के मूल्य स्तर बहुत भिन्न हैं। अलग रुझान देखने के लिए नीचे दिए गए नाम पर टैप करें।'}
            </Text>
          </View>
        </View>
      )}

      {/* Focus Mode Indicator */}
      {focusedId && (
        <View style={styles.focusHeaderRow}>
          <Text style={styles.focusTitle}>
            {t('market.focusingOn')}{' '}
            <Text style={{ fontWeight: '700', color: chartPayload.productsMeta[0]?.color }}>
              {language === 'hi' && chartPayload.productsMeta[0]?.name_hi 
                ? chartPayload.productsMeta[0]?.name_hi 
                : chartPayload.productsMeta[0]?.name_en}
            </Text>
          </Text>
          <TouchableOpacity onPress={() => onSelectFocus(null)} style={styles.resetFocusBtn}>
            <Text style={styles.resetFocusText}>
              {t('market.viewAllSelected')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SVG Line Chart (Clean without embedded canvas legend) */}
      <LineChart
        data={{
          labels: chartPayload.labels,
          datasets: chartPayload.datasets
        }}
        width={screenWidth - 32}
        height={240}
        chartConfig={chartConfig}
        bezier={chartPayload.sortedDates.length < 25}
        style={styles.chart}
        withDots={chartPayload.sortedDates.length < 25}
        yAxisLabel="₹"
        formatYLabel={(y) => {
          const val = Math.round(Number(y));
          if (val >= 1000) {
            return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
          }
          return val.toString();
        }}
        segments={4}
        onDataPointClick={({ value, dataset, getColor, index }) => {
          const clickedDate = chartPayload.sortedDates[index];
          // Find matching product
          const matchingProduct = chartPayload.productsMeta.find(p => p.dataPoints[index] === value);
          setSelectedPoint({
            date: clickedDate,
            price: value,
            productName: matchingProduct 
              ? (language === 'hi' && matchingProduct.name_hi ? matchingProduct.name_hi : matchingProduct.name_en)
              : '',
            unit: matchingProduct?.unit || 'Quintal'
          });
        }}
      />

      {/* Interactive Tooltip Callout */}
      {selectedPoint && (
        <View style={styles.tooltipBox}>
          <View style={styles.tooltipRow}>
            <Text style={styles.tooltipDate}>{selectedPoint.date}</Text>
            <TouchableOpacity onPress={() => setSelectedPoint(null)}>
              <Text style={styles.tooltipClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.tooltipProduct}>{selectedPoint.productName}</Text>
          <Text style={styles.tooltipPrice}>
            ₹{formatCurrencyINR(selectedPoint.price, false)} / {selectedPoint.unit}
          </Text>
        </View>
      )}

      {/* External Responsive Legend & Focus Selector */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendHeader}>
          {t('market.commoditiesInChart')} (
          {chartPayload.productsMeta.length})
        </Text>
        <View style={styles.legendGrid}>
          {chartPayload.productsMeta.map((p) => {
            const isCurrentFocus = focusedId === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.legendChip,
                  isCurrentFocus && styles.legendChipFocused,
                  { borderLeftColor: p.color }
                ]}
                onPress={() => {
                  if (focusedId === p.id) {
                    onSelectFocus(null); // toggle off focus
                  } else {
                    onSelectFocus(p.id); // focus on this product
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.colorDot, { backgroundColor: p.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.legendName} numberOfLines={1}>
                    {language === 'hi' && p.name_hi ? p.name_hi : p.name_en}
                  </Text>
                  <Text style={styles.legendPrice}>
                    ₹{Number(p.latestPrice).toLocaleString('en-IN')} / {p.unit}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    ...theme.elevation.sm,
  },
  chart: {
    marginVertical: 4,
    borderRadius: 14,
    alignSelf: 'center',
  },
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  singlePointContainer: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    ...theme.elevation.sm,
  },
  singlePointTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  singlePointDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  singlePointDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  recordedPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recordedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  singlePointNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
  },
  singlePointNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 3,
  },
  singlePointNoticeDesc: {
    fontSize: 11.5,
    color: '#92400E',
    lineHeight: 16,
  },
  singlePointSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  singlePointList: {
    gap: 8,
  },
  singlePointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
  },
  singlePointRowFocused: {
    backgroundColor: '#FFF7ED',
    borderColor: theme.colors.primary,
  },
  legendColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  singlePointName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  singlePointDateSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  singlePointPrice: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  disparityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 8,
    marginHorizontal: 8,
  },
  disparityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 2,
  },
  disparityDesc: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  focusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  focusTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  resetFocusBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resetFocusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  tooltipBox: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  tooltipDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tooltipClose: {
    fontSize: 12,
    color: '#94A3B8',
    paddingHorizontal: 4,
  },
  tooltipProduct: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tooltipPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
    marginTop: 1,
  },
  legendContainer: {
    marginTop: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  legendHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    minWidth: '45%',
    maxWidth: '48%',
    flex: 1,
    gap: 6,
  },
  legendChipFocused: {
    backgroundColor: '#FFF7ED',
    borderColor: theme.colors.primary,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  legendPrice: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
