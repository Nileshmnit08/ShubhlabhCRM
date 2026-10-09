import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { theme } from '../../../shared/theme';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: theme.colors.surface,
  backgroundGradientFrom: theme.colors.surface,
  backgroundGradientTo: theme.colors.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`, // primary orange
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`, // textSecondary
  style: {
    borderRadius: 16
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: theme.colors.white
  }
};

const CHART_COLORS = [
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#6366F1'  // Indigo
];

export default function MarketGraph({ prices = [], materials = [], watchlists = [], range }) {
  const chartData = useMemo(() => {
    if (prices.length === 0 || watchlists.length === 0) return null;

    // We want to group prices by material and sort by date ascending for the chart
    // We will find all distinct dates across all prices to form the X axis
    const datesSet = new Set();
    prices.forEach(p => datesSet.add(p.entry_date));
    const sortedDates = Array.from(datesSet).sort();
    
    // To avoid overlapping too many labels on X axis
    let xLabels = [];
    if (sortedDates.length > 0) {
      if (sortedDates.length > 7) {
        // Just show start, mid, end roughly
        const step = Math.floor(sortedDates.length / 5);
        xLabels = sortedDates.filter((_, i) => i % step === 0);
      } else {
        xLabels = sortedDates;
      }
    }

    const datasets = [];
    let colorIdx = 0;

    watchlists.forEach(mId => {
      const materialPrices = prices.filter(p => p.raw_material_id === mId).sort((a,b) => a.entry_date.localeCompare(b.entry_date));
      if (materialPrices.length === 0) return;

      // We need a value for each date in sortedDates. If missing, we can either:
      // 1. carry forward previous value
      // 2. map only existing points
      // We will map only existing points by creating an array of values corresponding to sortedDates
      // But chart-kit requires datasets to have same length as labels if we use standard data.
      // So we will pad with previous known value or 0 if none
      
      let currentVal = Number(materialPrices[0].price);
      const dataPoints = sortedDates.map(date => {
        const found = materialPrices.find(p => p.entry_date === date);
        if (found) {
          currentVal = Number(found.price);
        }
        return currentVal;
      });

      const material = materials.find(m => m.id === mId);

      datasets.push({
        data: dataPoints,
        color: (opacity = 1) => CHART_COLORS[colorIdx % CHART_COLORS.length],
        strokeWidth: 2,
        name: material ? (material.name_en) : 'Unknown'
      });
      colorIdx++;
    });

    if (datasets.length === 0) return null;

    // Formatting xLabels just MM-DD for compactness
    const formattedLabels = sortedDates.map(d => {
       if (xLabels.includes(d)) {
         const parts = d.split('-');
         return `${parts[1]}/${parts[2]}`;
       }
       return '';
    });

    return {
      labels: formattedLabels,
      datasets: datasets,
      legend: datasets.map(d => d.name)
    };
  }, [prices, watchlists, materials]);

  if (!chartData) {
    return (
      <View style={styles.container}>
        <Text style={styles.noData}>Not enough data to display graph</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LineChart
        data={chartData}
        width={screenWidth - 32} // from padding
        height={260}
        chartConfig={chartConfig}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16
        }}
        withDots={chartData.labels.length < 30}
        yAxisLabel="₹"
        formatYLabel={(y) => Math.round(Number(y)).toString()}
        segments={4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noData: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    padding: theme.spacing.xl,
  }
});
