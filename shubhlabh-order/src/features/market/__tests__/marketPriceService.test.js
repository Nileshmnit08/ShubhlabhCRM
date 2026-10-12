const test = require('node:test');
const assert = require('node:assert/strict');
const {
  deduplicateAndSortPrices,
  getCutoffDateForRange,
  filterPricesByRange,
  calculatePriceTrend,
  detectScaleCompatibility,
  prepareChartData,
  getCommodityColor,
  formatCurrencyINR,
} = require('../marketPriceService');

test('SL-ORDER-MARKET-PRICE-REDESIGN-01: Market Price Service', async (t) => {
  
  await t.test('1. Deduplication: Retains newest created_at record for same product & date', () => {
    const rawPrices = [
      { id: 'p1', raw_material_id: 'm1', effective_date: '2026-10-09', price: 4450, created_at: '2026-10-09T04:49:19Z' },
      { id: 'p2', raw_material_id: 'm1', effective_date: '2026-10-09', price: 1850.5, created_at: '2026-10-09T04:52:25Z' }, // newer
      { id: 'p3', raw_material_id: 'm1', effective_date: '2026-10-08', price: 4400, created_at: '2026-10-08T04:00:00Z' },
    ];

    const deduplicated = deduplicateAndSortPrices(rawPrices);

    assert.equal(deduplicated.length, 2, 'Should only have 2 unique dates for m1');
    assert.equal(deduplicated[0].effective_date, '2026-10-08');
    assert.equal(deduplicated[1].effective_date, '2026-10-09');
    assert.equal(deduplicated[1].price, 1850.5, 'Should preserve the latest created_at price for 2026-10-09');
  });

  await t.test('2. Chronological Sorting: Correctly orders observations ascending by date', () => {
    const unordered = [
      { raw_material_id: 'm1', effective_date: '2026-10-10', price: 100 },
      { raw_material_id: 'm1', effective_date: '2026-10-01', price: 90 },
      { raw_material_id: 'm1', effective_date: '2026-10-05', price: 95 },
    ];

    const sorted = deduplicateAndSortPrices(unordered);
    assert.equal(sorted[0].effective_date, '2026-10-01');
    assert.equal(sorted[1].effective_date, '2026-10-05');
    assert.equal(sorted[2].effective_date, '2026-10-10');
  });

  await t.test('3. Time Filters: Correctly calculates cutoff dates for Day, Week, Month, Year', () => {
    const fixedNow = new Date('2026-10-12T12:00:00Z');

    const dayCutoff = getCutoffDateForRange('day', fixedNow);
    const weekCutoff = getCutoffDateForRange('week', fixedNow);
    const monthCutoff = getCutoffDateForRange('month', fixedNow);
    const yearCutoff = getCutoffDateForRange('year', fixedNow);

    assert.equal(dayCutoff, '2026-10-11', 'Day cutoff should be 1 day ago');
    assert.equal(weekCutoff, '2026-10-05', 'Week cutoff should be 7 days ago');
    assert.equal(monthCutoff, '2026-09-12', 'Month cutoff should be 30 days ago');
    assert.equal(yearCutoff, '2025-10-12', 'Year cutoff should be 365 days ago');
  });

  await t.test('4. Date Filtering: Filters array accurately based on selected range', () => {
    const fixedNow = new Date('2026-10-12T12:00:00Z');
    const records = [
      { raw_material_id: 'm1', effective_date: '2026-10-12', price: 100 },
      { raw_material_id: 'm1', effective_date: '2026-10-08', price: 98 },
      { raw_material_id: 'm1', effective_date: '2026-10-01', price: 95 },
      { raw_material_id: 'm1', effective_date: '2026-08-01', price: 90 },
    ];

    const weekRecords = filterPricesByRange(records, 'week', fixedNow);
    assert.equal(weekRecords.length, 2, 'Week records should include 10-12 and 10-08');

    const monthRecords = filterPricesByRange(records, 'month', fixedNow);
    assert.equal(monthRecords.length, 3, 'Month records should include 10-12, 10-08, and 10-01');

    const yearRecords = filterPricesByRange(records, 'year', fixedNow);
    assert.equal(yearRecords.length, 4, 'Year records should include all');
  });

  await t.test('5. Price Trends: Computes positive, negative, and null changes reliably', () => {
    // Up trend
    const trendUp = calculatePriceTrend({ price: 4450 }, { price: 4200 });
    assert.equal(trendUp.isUp, true);
    assert.equal(trendUp.changeVal, 250);
    assert.equal(trendUp.changePercent, 6.0);

    // Down trend
    const trendDown = calculatePriceTrend({ price: 1850 }, { price: 2000 });
    assert.equal(trendDown.isUp, false);
    assert.equal(trendDown.changeVal, -150);
    assert.equal(trendDown.changePercent, -7.5);

    // Missing previous price (must omit rather than inventing 0 or dummy arrow)
    const trendNoPrev = calculatePriceTrend({ price: 2900 }, null);
    assert.equal(trendNoPrev, null, 'Must omit trend when no previous price exists');

    // Non-positive previous price
    const trendZero = calculatePriceTrend({ price: 2900 }, { price: 0 });
    assert.equal(trendZero, null, 'Must omit trend when previous price is 0');
  });

  await t.test('6. Scale Disparity: Detects when commodities have widely divergent price ranges', () => {
    // Normal case: similar price ranges (e.g. Khal ₹4,450 and Jaggery ₹5,600)
    const similarDatasets = [
      { data: [4400, 4450] },
      { data: [5500, 5600] }
    ];
    const similarCheck = detectScaleCompatibility(similarDatasets);
    assert.equal(similarCheck.isScaleDisparate, false);

    // Disparate case: Oil (₹21,000) and Methi (₹220)
    const disparateDatasets = [
      { data: [21000, 21000] },
      { data: [220, 220] }
    ];
    const disparateCheck = detectScaleCompatibility(disparateDatasets);
    assert.equal(disparateCheck.isScaleDisparate, true, 'Ratio ~95x should trigger scale disparity');
    assert.ok(disparateCheck.maxRatio > 4);
  });

  await t.test('7. Chart Data Preparation: Excludes canvas legend to prevent label collision', () => {
    const materials = [
      { id: 'm1', name_en: 'Mustard Khal', name_hi: 'सरसों खल' },
      { id: 'm2', name_en: 'Soybean Meal', name_hi: 'सोया खली' },
    ];
    const prices = [
      { raw_material_id: 'm1', effective_date: '2026-10-08', price: 4400, unit: 'Quintal' },
      { raw_material_id: 'm1', effective_date: '2026-10-09', price: 4450, unit: 'Quintal' },
      { raw_material_id: 'm2', effective_date: '2026-10-08', price: 5500, unit: 'Quintal' },
      { raw_material_id: 'm2', effective_date: '2026-10-09', price: 5550, unit: 'Quintal' },
    ];

    const chartConfig = prepareChartData(prices, ['m1', 'm2'], materials);

    assert.ok(chartConfig, 'Chart config should be created');
    assert.equal(chartConfig.legend, undefined, 'Canvas legend must NOT be present on chartData');
    assert.equal(chartConfig.datasets.length, 2);
    assert.equal(chartConfig.productsMeta.length, 2);
    assert.equal(chartConfig.productsMeta[0].name_en, 'Mustard Khal');
    assert.equal(chartConfig.productsMeta[1].name_en, 'Soybean Meal');
    assert.ok(chartConfig.productsMeta[0].color, 'Each product must have an assigned color');
    assert.notEqual(chartConfig.productsMeta[0].color, chartConfig.productsMeta[1].color, 'Products must have distinct colors');
  });

  await t.test('8. Currency Formatting: Formats INR properly without crashing', () => {
    assert.equal(formatCurrencyINR(21000), '21,000.00');
    assert.equal(formatCurrencyINR(4450.5), '4,450.50');
    assert.equal(formatCurrencyINR(0), '0.00');
    assert.equal(formatCurrencyINR(null), '0.00');
    assert.equal(formatCurrencyINR(undefined), '0.00');
    assert.equal(formatCurrencyINR('invalid'), '0.00');
  });

});
