import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { theme } from '../../../shared/theme';
import { useTranslation } from '../../../shared/localization/i18n';
import { 
  prepareChartData, 
  detectScaleCompatibility, 
  getCommodityColor 
} from '../marketPriceService';
import { CircleAlert, Eye, Info } from 'lucide-react-native';

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

  if (!chartPayload || chartPayload.datasets.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Info size={28} color={theme.colors.textMuted} style={{ marginBottom: 8 }} />
        <Text style={styles.emptyTitle}>
          {t('profile.language') === 'Language' ? 'Not Enough Price Data' : 'पर्याप्त मूल्य डेटा नहीं है'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {t('profile.language') === 'Language' 
            ? 'No historical price records found for the selected products and time range.' 
            : 'चयनित उत्पादों और समय सीमा के लिए कोई ऐतिहासिक मूल्य रिकॉर्ड नहीं मिला।'}
        </Text>
      </View>
    );
  }

  // Handle single data point case (chart-kit requires >= 2 points for a line)
  const isSinglePoint = chartPayload.sortedDates.length === 1;

  if (isSinglePoint) {
    const singleDate = chartPayload.sortedDates[0];
    return (
      <View style={styles.singlePointContainer}>
        <Text style={styles.singlePointHeader}>
          {t('profile.language') === 'Language' ? 'Single Price Observation' : 'एकल मूल्य अवलोकन'} ({singleDate})
        </Text>
        <View style={styles.singlePointList}>
          {chartPayload.productsMeta.map((p, idx) => (
            <View key={p.id || idx} style={styles.singlePointRow}>
              <View style={styles.legendColorRow}>
                <View style={[styles.colorDot, { backgroundColor: p.color }]} />
                <Text style={styles.singlePointName}>
                  {language === 'hi' && p.name_hi ? p.name_hi : p.name_en}
                </Text>
              </View>
              <Text style={styles.singlePointPrice}>
                ₹{Number(p.latestPrice).toLocaleString('en-IN')} / {p.unit}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.singlePointHint}>
          {t('profile.language') === 'Language' 
            ? 'A line chart will appear as additional historical dates are recorded.' 
            : 'अतिरिक्त ऐतिहासिक तिथियाँ दर्ज होने पर लाइन चार्ट प्रदर्शित होगा।'}
        </Text>
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
            {t('profile.language') === 'Language' ? 'Focusing on:' : 'फोकस:'}{' '}
            <Text style={{ fontWeight: '700', color: chartPayload.productsMeta[0]?.color }}>
              {language === 'hi' && chartPayload.productsMeta[0]?.name_hi 
                ? chartPayload.productsMeta[0]?.name_hi 
                : chartPayload.productsMeta[0]?.name_en}
            </Text>
          </Text>
          <TouchableOpacity onPress={() => onSelectFocus(null)} style={styles.resetFocusBtn}>
            <Text style={styles.resetFocusText}>
              {t('profile.language') === 'Language' ? 'View All Selected' : 'सभी देखें'}
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
            ₹{Number(selectedPoint.price).toLocaleString('en-IN')} / {selectedPoint.unit}
          </Text>
        </View>
      )}

      {/* External Responsive Legend & Focus Selector */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendHeader}>
          {t('profile.language') === 'Language' ? 'COMMODITIES IN CHART' : 'चार्ट में सामग्रियां'} (
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
  },
  singlePointHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  singlePointList: {
    gap: 8,
    marginBottom: 10,
  },
  singlePointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  legendColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  singlePointName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  singlePointPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  singlePointHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
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
