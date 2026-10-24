/**
 * PDM-UI-REFERENCE-MATCH-01: metrics for the Product Demand Intelligence page.
 *
 * Builds on lib/territoryDemand.js (signal identity, open/active rules, filters).
 * Rules (see territoryDemand.js header for sources):
 *   - Products exist only on requirement / intent signals (requirements.product_type).
 *     Tally ledger names are never products; Repeat Purchase Evidence is never a product.
 *   - Trend windows compare a period with the previous equal period; zero or thin
 *     history gives a neutral status instead of a percentage.
 *   - Location = customer city/state as stored on crm_parties (no inference).
 *   - "No recent demand recorded" (no signals in the window) is distinct from
 *     having no market demand; the UI never states the latter.
 *
 * Pure module: unit-tested in __tests__/productDemandIntel.test.mjs.
 */
import {
  SIGNAL, UNASSIGNED, territoryOf, hasRealProduct, isOpenRequirement, isActiveIntent, isTransaction,
} from './territoryDemand.js';

const DAY_MS = 86400000;
export const LOCATION_NOT_RECORDED = 'Location not recorded';
export const SERIES_COLORS = ['#2563eb', '#f59e0b', '#16a34a', '#8b5cf6', '#ef4444'];

const toMs = (v) => {
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
};

export const productOf = (s) => s.standardized_product_name || s.product_reference || 'Unknown';
export const locationOf = (s) => s.location_label || null;

/** Product-attributable signals only. */
export const productSignals = (signals) => (signals || []).filter(hasRealProduct);

export function trendStatus(current, previous) {
  if (current === 0 && previous === 0) return { status: 'No recent demand', pct: null, tone: 'neutral' };
  if (previous === 0) return { status: 'New', pct: null, tone: 'neutral' };
  if (current + previous < 4) return { status: 'Limited data', pct: null, tone: 'neutral' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct >= 15) return { status: 'Growing', pct, tone: 'up' };
  if (pct <= -15) return { status: 'Declining', pct, tone: 'down' };
  return { status: 'Stable', pct, tone: 'flat' };
}

/** Counts of product signals in [end - days, end] and the previous equal window. */
export function windowCounts(rows, endMs, days) {
  const curFrom = endMs - days * DAY_MS;
  const prevFrom = curFrom - days * DAY_MS;
  let current = 0;
  let previous = 0;
  rows.forEach((s) => {
    const t = toMs(s.signal_date);
    if (t === null) return;
    if (t > curFrom && t <= endMs) current++;
    else if (t > prevFrom && t <= curFrom) previous++;
  });
  return { current, previous };
}

/**
 * 12 rolling weekly buckets ending at endMs.
 * Returns [{ weekStart: ISO, key: 'w0'.. }] plus per-product counts by metric.
 */
export function weeklySeries(rows, products, { endMs, weeks = 12, metric = 'total' } = {}) {
  const startMs = endMs - weeks * 7 * DAY_MS;
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const b = { weekStart: new Date(startMs + i * 7 * DAY_MS).toISOString() };
    products.forEach((p) => { b[p] = 0; });
    return b;
  });
  const keep = metric === 'open' ? isOpenRequirement : metric === 'intents' ? isActiveIntent : () => true;
  rows.forEach((s) => {
    const p = productOf(s);
    if (!products.includes(p) || !keep(s)) return;
    const t = toMs(s.signal_date);
    if (t === null || t <= startMs || t > endMs) return;
    const idx = Math.min(weeks - 1, Math.floor((t - startMs - 1) / (7 * DAY_MS)));
    buckets[idx][p]++;
  });
  return buckets;
}

const distinctCount = (rows, fn) => new Set(rows.map(fn).filter(Boolean)).size;

/**
 * Per-product statistics.
 *  filtered: date-bounded signals (totals); base: same filters without the date range (trends)
 */
export function productStats(filtered, base, { endMs, compareDays = 30 } = {}) {
  const fRows = productSignals(filtered);
  const bRows = productSignals(base);
  const names = [...new Set(fRows.map(productOf))];
  return names.map((name) => {
    const rows = fRows.filter((s) => productOf(s) === name);
    const hist = bRows.filter((s) => productOf(s) === name);
    const { current, previous } = windowCounts(hist, endMs, compareDays);
    return {
      name,
      category: rows[0]?.product_category || 'Uncategorized',
      total: rows.length,
      openRequirements: rows.filter(isOpenRequirement).length,
      activeIntents: rows.filter(isActiveIntent).length,
      customers: distinctCount(rows, (s) => s.party_id),
      locations: distinctCount(rows, locationOf),
      current,
      previous,
      ...trendStatus(current, previous),
    };
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

const METRIC_FNS = {
  total: () => true,
  open: isOpenRequirement,
  intents: isActiveIntent,
};

/** Ranking by territory (same aggregation feeds the tile view and the ranked list). */
export function territoryRanking(rows, metric = 'total') {
  const keep = METRIC_FNS[metric] || METRIC_FNS.total;
  const m = new Map();
  rows.forEach((s) => {
    const t = territoryOf(s);
    if (!m.has(t)) m.set(t, 0);
    if (keep(s)) m.set(t, m.get(t) + 1);
  });
  return [...m.entries()].map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

/** Ranking by recorded customer location; unrecorded locations are counted separately. */
export function locationRanking(rows, metric = 'total') {
  const m = new Map();
  let unrecorded = 0;
  const customersBy = new Map();
  rows.forEach((s) => {
    const loc = locationOf(s);
    if (!loc) { unrecorded++; return; }
    if (metric === 'customers') {
      if (!customersBy.has(loc)) customersBy.set(loc, new Set());
      if (s.party_id) customersBy.get(loc).add(s.party_id);
      return;
    }
    const keep = METRIC_FNS[metric] || METRIC_FNS.total;
    if (!m.has(loc)) m.set(loc, 0);
    if (keep(s)) m.set(loc, m.get(loc) + 1);
  });
  const entries = metric === 'customers'
    ? [...customersBy.entries()].map(([name, set]) => ({ name, value: set.size }))
    : [...m.entries()].map(([name, value]) => ({ name, value }));
  return {
    rows: entries.filter((e) => e.value > 0).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)),
    unrecorded,
  };
}

/** Top-N with an "Others" row summing the rest (values reconcile with the full ranking). */
export function topWithOthers(ranking, n = 7) {
  if (ranking.length <= n + 1) return ranking;
  const others = ranking.slice(n).reduce((sum, r) => sum + r.value, 0);
  return [...ranking.slice(0, n), { name: 'Others', value: others, isOthers: true }];
}

/** Fixed legend buckets for territory intensity: 0, 1–5, 6–10, 11–20, 21+. */
export const INTENSITY_BUCKETS = [
  { label: '21+', min: 21, color: '#1e40af' },
  { label: '11 – 20', min: 11, color: '#3b82f6' },
  { label: '6 – 10', min: 6, color: '#93c5fd' },
  { label: '1 – 5', min: 1, color: '#dbeafe' },
  { label: '0', min: 0, color: '#f1f5f9' },
];
export const intensityColor = (v) => (INTENSITY_BUCKETS.find((b) => v >= b.min) || INTENSITY_BUCKETS[4]).color;

/**
 * Mutually exclusive distribution of a product's signals:
 * every product signal is exactly one of these four, so percentages sum to 100.
 */
export function statusDistribution(rows) {
  const product = productSignals(rows);
  const buckets = [
    { key: 'open', label: 'Open requirements', color: '#ef4444', value: product.filter(isOpenRequirement).length },
    { key: 'closedReq', label: 'Closed / lost requirements', color: '#94a3b8', value: product.filter((s) => s.signal_type === SIGNAL.REQUIREMENT && !isOpenRequirement(s)).length },
    { key: 'intent', label: 'Active buying intents', color: '#f59e0b', value: product.filter(isActiveIntent).length },
    { key: 'closedIntent', label: 'Closed / lost intents', color: '#cbd5e1', value: product.filter((s) => s.signal_type === SIGNAL.INTENT && !isActiveIntent(s)).length },
  ];
  const total = product.length;
  return { total, buckets: withWholePercents(buckets, total) };
}

/** Largest-remainder rounding so displayed whole percentages always sum to 100. */
export function withWholePercents(buckets, total) {
  if (!total) return buckets.map((b) => ({ ...b, pct: 0 }));
  const raw = buckets.map((b, i) => ({ i, exact: (b.value / total) * 100 }));
  const floors = raw.map((r) => Math.floor(r.exact));
  let remaining = 100 - floors.reduce((n, v) => n + v, 0);
  raw.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || a.i - b.i)
    .forEach((r) => { if (remaining > 0 && buckets[r.i].value > 0) { floors[r.i]++; remaining--; } });
  return buckets.map((b, i) => ({ ...b, pct: floors[i] }));
}

export function signalLabel(s) {
  if (s.signal_type === SIGNAL.REQUIREMENT) return isOpenRequirement(s) ? 'Open requirement' : `Requirement (${s.signal_status || 'closed'})`;
  if (s.signal_type === SIGNAL.INTENT) return isActiveIntent(s) ? 'Buying intent' : `Intent (${s.signal_status || 'closed'})`;
  if (s.signal_type === SIGNAL.TRANSACTION) return 'Transaction';
  return 'Repeat purchase pattern';
}

export const CUSTOMER_STATUSES = ['Open requirement', 'Active intent', 'Transaction recorded', 'No open demand'];

/** One row per customer for the details table. */
export function customerRows(rows) {
  const m = new Map();
  rows.forEach((s) => {
    if (!s.party_id) return;
    if (!m.has(s.party_id)) {
      m.set(s.party_id, {
        partyId: s.party_id, name: s.party_name || 'Unknown customer',
        location: locationOf(s), territory: territoryOf(s),
        total: 0, openRequirements: 0, activeIntents: 0, transactions: 0,
        lastMs: null, latest: null, latestRequirementId: null, latestRequirementMs: null,
      });
    }
    const c = m.get(s.party_id);
    c.total++;
    if (isOpenRequirement(s)) c.openRequirements++;
    if (isActiveIntent(s)) c.activeIntents++;
    if (isTransaction(s)) c.transactions++;
    if (!c.location && locationOf(s)) c.location = locationOf(s);
    const t = s.signal_type === SIGNAL.REPEAT ? null : toMs(s.signal_date);
    if (t !== null && (c.lastMs === null || t > c.lastMs)) { c.lastMs = t; c.latest = s; }
    if (hasRealProduct(s) && t !== null && (c.latestRequirementMs === null || t > c.latestRequirementMs)) {
      c.latestRequirementMs = t; c.latestRequirementId = s.source_id;
    }
  });
  return [...m.values()].map((c) => ({
    ...c,
    latestSignal: c.latest ? signalLabel(c.latest) : '—',
    latestProduct: c.latest && hasRealProduct(c.latest) ? productOf(c.latest) : null,
    status: c.openRequirements > 0 ? 'Open requirement'
      : c.activeIntents > 0 ? 'Active intent'
        : c.transactions > 0 ? 'Transaction recorded' : 'No open demand',
  }));
}

export function filterAndSortCustomers(rows, { search = '', status = 'All', sort = 'lastDate' } = {}) {
  const q = search.trim().toLowerCase();
  const out = rows.filter((r) => {
    if (status !== 'All' && r.status !== status) return false;
    if (!q) return true;
    return [r.name, r.location, r.territory, r.latestProduct].some((v) => v && v.toLowerCase().includes(q));
  });
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (sort === 'signals') out.sort((a, b) => b.total - a.total || byName(a, b));
  else if (sort === 'name') out.sort(byName);
  else out.sort((a, b) => (b.lastMs ?? -Infinity) - (a.lastMs ?? -Infinity) || byName(a, b));
  return out;
}

/** Evidence-based observations for the selected product (or all products). */
export function quickInsights(stat, rows) {
  const items = [];
  if (stat) {
    if (stat.pct !== null) {
      items.push({ kind: stat.tone === 'down' ? 'down' : 'up', text: `Demand ${stat.pct >= 0 ? 'increased' : 'decreased'} by ${Math.abs(stat.pct)}% vs the previous 30 days (${stat.current} vs ${stat.previous} signals).` });
    } else if (stat.status === 'No recent demand') {
      items.push({ kind: 'flat', text: 'No recent demand recorded in the last 60 days.' });
    } else {
      items.push({ kind: 'flat', text: `${stat.current} signals in the last 30 days; not enough history for a trend.` });
    }
  }
  const product = productSignals(rows);
  const customers = new Set(product.map((s) => s.party_id).filter(Boolean)).size;
  const locations = new Set(product.map(locationOf).filter(Boolean)).size;
  const open = product.filter(isOpenRequirement).length;
  items.push({ kind: 'customers', text: `${customers} unique customer${customers === 1 ? '' : 's'} have recorded demand.` });
  items.push({ kind: 'locations', text: `${locations} location${locations === 1 ? '' : 's'} with recorded demand.` });
  items.push({ kind: 'open', text: `${open} open requirement${open === 1 ? '' : 's'} need follow-up.` });
  return items;
}

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of the customer table exactly as filtered and sorted on screen. */
export function customersToCsv(rows, formatDate) {
  const header = ['#', 'Customer', 'Location', 'Territory', 'Total signals', 'Open requirements', 'Buying intents', 'Last demand date', 'Latest signal', 'Status'];
  const lines = rows.map((r, i) => [
    i + 1, r.name, r.location || LOCATION_NOT_RECORDED, r.territory, r.total, r.openRequirements, r.activeIntents,
    r.lastMs ? formatDate(r.lastMs) : '', r.latestSignal + (r.latestProduct ? ` (${r.latestProduct})` : ''), r.status,
  ].map(csvCell).join(','));
  return [header.join(','), ...lines].join('\n');
}

export { UNASSIGNED };
