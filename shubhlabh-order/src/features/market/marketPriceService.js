/**
 * MARKET PRICE SERVICE
 * 
 * Pure functions for market price deduplication, date range filtering,
 * trend calculations, and chart preparation.
 */

export const COMMODITY_COLORS = [
  '#F97316', // Orange (Shubh Labh Primary)
  '#2563EB', // Blue
  '#059669', // Emerald Green
  '#7C3AED', // Purple
  '#DB2777', // Pink / Magenta
  '#D97706', // Amber
  '#0891B2', // Cyan
  '#DC2626', // Red
  '#4F46E5', // Indigo
  '#0D9488', // Teal
];

/**
 * Returns a stable color for a commodity based on its ID or index.
 */
export function getCommodityColor(index) {
  return COMMODITY_COLORS[index % COMMODITY_COLORS.length];
}

/**
 * Deduplicates price records for the same raw_material_id and effective_date,
 * retaining the most recently created record (by created_at).
 * Sorts records chronologically ascending by effective_date.
 *
 * @param {Array} prices Raw price records
 * @returns {Array} Deduplicated, sorted prices
 */
export function deduplicateAndSortPrices(prices = []) {
  if (!Array.isArray(prices) || prices.length === 0) return [];

  // Group by `${raw_material_id}_${effective_date}`
  const map = new Map();

  prices.forEach(p => {
    if (!p || !p.raw_material_id || !p.effective_date) return;
    const key = `${p.raw_material_id}_${p.effective_date}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, p);
    } else {
      // Keep the one with newer created_at, or higher price if created_at is identical
      const existingCreated = new Date(existing.created_at || 0).getTime();
      const currentCreated = new Date(p.created_at || 0).getTime();
      if (currentCreated > existingCreated) {
        map.set(key, p);
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const cmp = a.effective_date.localeCompare(b.effective_date);
    if (cmp !== 0) return cmp;
    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });
}

/**
 * Calculates the local cutoff date string ('YYYY-MM-DD') for a given range.
 * Range definitions:
 * - 'day': Past 24-48 hours (covers today and yesterday for market close comparison)
 * - 'week': Past 7 days
 * - 'month': Past 30 days
 * - 'year': Past 365 days
 *
 * @param {string} range 'day' | 'week' | 'month' | 'year'
 * @param {Date} [referenceDate] Optional reference date (defaults to now)
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
export function getCutoffDateForRange(range = 'week', referenceDate = new Date()) {
  const d = new Date(referenceDate);

  switch (range) {
    case 'day':
      d.setDate(d.getDate() - 1);
      break;
    case 'week':
      d.setDate(d.getDate() - 7);
      break;
    case 'month':
      d.setDate(d.getDate() - 30);
      break;
    case 'year':
      d.setDate(d.getDate() - 365);
      break;
    default:
      d.setDate(d.getDate() - 7);
      break;
  }

  // Format as YYYY-MM-DD using local time
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Filters prices by date range using local cutoff.
 *
 * @param {Array} prices
 * @param {string} range 'day' | 'week' | 'month' | 'year'
 * @param {Date} [referenceDate]
 * @returns {Array}
 */
export function filterPricesByRange(prices = [], range = 'week', referenceDate = new Date()) {
  if (!Array.isArray(prices) || prices.length === 0) return [];
  const cutoff = getCutoffDateForRange(range, referenceDate);
  return prices.filter(p => p.effective_date >= cutoff);
}

/**
 * Calculates change value, percentage, and trend direction between two prices.
 * Returns null if reliable previous price does not exist or is non-positive.
 *
 * @param {Object} latest Latest price record
 * @param {Object} previous Previous price record
 * @returns {Object|null} { changeVal, changePercent, isUp } or null
 */
export function calculatePriceTrend(latest, previous) {
  if (!latest || typeof latest.price !== 'number' && isNaN(Number(latest.price))) {
    return null;
  }
  if (!previous || typeof previous.price !== 'number' && isNaN(Number(previous.price))) {
    return null;
  }

  const latestVal = Number(latest.price);
  const prevVal = Number(previous.price);

  if (prevVal <= 0) return null;

  const changeVal = latestVal - prevVal;
  const changePercent = (changeVal / prevVal) * 100;
  const isUp = changeVal > 0 ? true : changeVal < 0 ? false : null;

  return {
    changeVal: Math.round(changeVal * 100) / 100,
    changePercent: Math.round(changePercent * 10) / 10,
    isUp
  };
}

/**
 * Analyzes selected product price distributions to check if plotting on a single
 * shared Y-axis will flatten or distort lower-priced commodities.
 *
 * @param {Array} datasets Array of chart dataset objects with min/max values
 * @returns {{isScaleDisparate: boolean, maxRatio: number}}
 */
export function detectScaleCompatibility(datasets = []) {
  if (!datasets || datasets.length <= 1) {
    return { isScaleDisparate: false, maxRatio: 1 };
  }

  const averages = datasets
    .map(d => {
      const validPoints = (d.data || []).filter(v => typeof v === 'number' && v > 0);
      if (validPoints.length === 0) return 0;
      return validPoints.reduce((a, b) => a + b, 0) / validPoints.length;
    })
    .filter(avg => avg > 0);

  if (averages.length <= 1) {
    return { isScaleDisparate: false, maxRatio: 1 };
  }

  const minAvg = Math.min(...averages);
  const maxAvg = Math.max(...averages);
  const maxRatio = maxAvg / minAvg;

  // If the highest-priced commodity is > 4x the lowest (e.g. ₹21,000 vs ₹220 or ₹2,500),
  // a shared linear axis renders the lower products unreadable.
  return {
    isScaleDisparate: maxRatio > 4,
    maxRatio: Math.round(maxRatio * 10) / 10
  };
}

/**
 * Prepares chart data for react-native-chart-kit without embedded legends,
 * preventing canvas label collision.
 *
 * @param {Array} prices Deduplicated price records
 * @param {Array} selectedIds Array of selected raw_material_ids
 * @param {Array} materials Raw materials metadata
 * @returns {Object|null} { labels, datasets, productsMeta }
 */
export function prepareChartData(prices = [], selectedIds = [], materials = []) {
  if (!prices.length || !selectedIds.length) return null;

  // Find all distinct dates across selected products
  const selectedPrices = prices.filter(p => selectedIds.includes(p.raw_material_id));
  if (!selectedPrices.length) return null;

  const datesSet = new Set();
  selectedPrices.forEach(p => datesSet.add(p.effective_date));
  const sortedDates = Array.from(datesSet).sort();

  if (sortedDates.length === 0) return null;

  // Format compact X-axis labels (MM/DD)
  // To keep X-axis readable, space out labels
  const maxLabels = 5;
  const step = Math.max(1, Math.floor(sortedDates.length / maxLabels));

  const formattedLabels = sortedDates.map((date, idx) => {
    const isStep = idx % step === 0 || idx === sortedDates.length - 1;
    if (isStep) {
      const parts = date.split('-');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}`;
      }
      return date;
    }
    return '';
  });

  const datasets = [];
  const productsMeta = [];

  selectedIds.forEach((mId, index) => {
    const materialPrices = selectedPrices.filter(p => p.raw_material_id === mId);
    if (!materialPrices.length) return;

    const material = materials.find(m => m.id === mId) || { name_en: 'Commodity', id: mId };
    const color = getCommodityColor(index);

    // Carry forward latest known value across dates
    let currentVal = Number(materialPrices[0].price);
    const dataPoints = sortedDates.map(date => {
      const found = materialPrices.find(p => p.effective_date === date);
      if (found) {
        currentVal = Number(found.price);
      }
      return currentVal;
    });

    const latestPrice = Number(materialPrices[materialPrices.length - 1].price);
    const unit = materialPrices[materialPrices.length - 1].unit || 'Quintal';

    datasets.push({
      data: dataPoints,
      color: (opacity = 1) => color,
      strokeWidth: 2.5,
      // NOTE: DO NOT pass 'name' to datasets in chart-kit if legend is enabled,
      // as chart-kit draws legends on the canvas.
    });

    productsMeta.push({
      id: mId,
      name_en: material.name_en,
      name_hi: material.name_hi,
      category: material.category,
      color,
      latestPrice,
      unit,
      dataPoints
    });
  });

  if (!datasets.length) return null;

  return {
    labels: formattedLabels,
    sortedDates,
    datasets,
    productsMeta,
    // Intentionally no 'legend' property here to keep chart-kit canvas clean!
  };
}

/**
 * Format currency in Indian Rupees format (e.g. 21,000.00 or 4,450.00)
 *
 * @param {number|string} value
 * @param {boolean} includeDecimals
 * @returns {string}
 */
export function formatCurrencyINR(value, includeDecimals = true) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0.00';
  }
  const num = Number(value);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}
