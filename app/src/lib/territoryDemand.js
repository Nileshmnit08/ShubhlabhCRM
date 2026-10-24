/**
 * PDM-TERRITORY-INTELLIGENCE-01: territory demand logic for the Product Demand Matrix.
 *
 * Input rows are the page's enriched v_demand_signals rows:
 *   signal_type, source_id, party_id, party_name, signal_date, product_reference,
 *   signal_status, description, product_category, standardized_product_name, territory_name
 *
 * Definitions (traced to existing CRM objects):
 *   - A signal is unique by (signal_type, source_id) — 75_sprint_18_1_demand_signals.sql.
 *   - Open requirement: 'Stated Requirement' whose status is not Closed / Lost / Confirmed
 *     (same rule as view v_open_requirements, 06_sprint_6_schema.sql, and Performance.jsx).
 *   - Active buying intent: 'Commercial Intent' with an open status (same rule).
 *   - Completed transaction: 'Tally Transaction' (Tally sales voucher).
 *   - 'Repeat Purchase Evidence' has a synthetic date (CURRENT_DATE) and no product, so it
 *     is excluded from date-bounded periods, product rankings and trends.
 *   - Only requirements and intents carry a real product (requirements.product_type);
 *     a Tally Transaction's product_reference is the customer's ledger name.
 *
 * Pure module (no React / Supabase): unit-tested in __tests__/territoryDemand.test.mjs.
 */

export const SIGNAL = {
  REQUIREMENT: 'Stated Requirement',
  INTENT: 'Commercial Intent',
  REPEAT: 'Repeat Purchase Evidence',
  TRANSACTION: 'Tally Transaction',
};

export const CLOSED_REQUIREMENT_STATUSES = ['Closed', 'Lost', 'Confirmed'];
export const UNASSIGNED = 'Unassigned';
export const ROW_LIMIT_HINT = 1000; // Supabase default max rows per request

export const PERIODS = [
  { value: 'ALL', label: 'All time', days: null },
  { value: 'D30', label: 'Last 30 days', days: 30 },
  { value: 'D90', label: 'Last 90 days', days: 90 },
  { value: 'D365', label: 'Last 12 months', days: 365 },
];

export const METRICS = [
  { key: 'demandSignals', label: 'Demand signals', help: 'All unique demand signals in the current filters.' },
  { key: 'openRequirements', label: 'Open requirements', help: 'Stated requirements not Closed, Lost or Confirmed.' },
  { key: 'activeIntents', label: 'Active buying intents', help: 'Commercial intents not Closed, Lost or Confirmed.' },
  { key: 'completedTransactions', label: 'Completed transactions', help: 'Tally sales vouchers.' },
];

const DAY_MS = 86400000;

export const signalKey = (s) => `${s.signal_type}:${s.source_id}`;
export const territoryOf = (s) => s.territory_name || UNASSIGNED;

const isOpenStatus = (status) => !CLOSED_REQUIREMENT_STATUSES.includes(status);
export const isOpenRequirement = (s) => s.signal_type === SIGNAL.REQUIREMENT && isOpenStatus(s.signal_status);
export const isActiveIntent = (s) => s.signal_type === SIGNAL.INTENT && isOpenStatus(s.signal_status);
export const isTransaction = (s) => s.signal_type === SIGNAL.TRANSACTION;
export const hasRealProduct = (s) => s.signal_type === SIGNAL.REQUIREMENT || s.signal_type === SIGNAL.INTENT;
const hasRealDate = (s) => s.signal_type !== SIGNAL.REPEAT;

const toMs = (v) => {
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
};

/** Removes duplicate rows of the same signal (same type + source id), keeping the first. */
export function dedupeSignals(signals) {
  const seen = new Set();
  const out = [];
  (signals || []).forEach((s) => {
    const k = signalKey(s);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(s);
  });
  return out;
}

/** { fromMs, toMs } for a period; fromMs null means all time. */
export function periodRange(period, now = new Date()) {
  const p = PERIODS.find((x) => x.value === period) || PERIODS[0];
  const end = now.getTime();
  return { fromMs: p.days ? end - p.days * DAY_MS : null, toMs: end, days: p.days };
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
/**
 * Explicit date range (YYYY-MM-DD, inclusive, Asia/Kolkata day boundaries).
 * Returns null when neither bound is set (= all time).
 */
export function dateRangeBounds(dateFrom, dateTo, now = new Date()) {
  const from = YMD.test(dateFrom || '') ? Date.parse(`${dateFrom}T00:00:00.000+05:30`) : null;
  const to = YMD.test(dateTo || '') ? Date.parse(`${dateTo}T23:59:59.999+05:30`) : null;
  if (from === null && to === null) return null;
  return { fromMs: from ?? -8.64e15, toMs: to ?? now.getTime(), days: null };
}

export function inPeriod(s, range) {
  if (!range || range.fromMs === null) return true;
  if (!hasRealDate(s)) return false;
  const t = toMs(s.signal_date);
  return t !== null && t >= range.fromMs && t <= range.toMs;
}

/**
 * Shared page filters. Territory, signal type and search keep the exact semantics of
 * the original ProductDemand filter; category and period are additive (default 'All').
 */
export function applyFilters(signals, { territory = 'All', signalType = 'All', category = 'All', search = '', period = 'ALL', dateFrom = '', dateTo = '', now = new Date() } = {}) {
  // An explicit date range takes precedence over a relative period.
  const range = dateRangeBounds(dateFrom, dateTo, now) || periodRange(period, now);
  const sq = (search || '').toLowerCase();
  return dedupeSignals(signals).filter((s) => {
    if (territory !== 'All' && territoryOf(s) !== territory) return false;
    if (signalType !== 'All' && s.signal_type !== signalType) return false;
    if (category !== 'All' && (s.product_category || 'Uncategorized') !== category) return false;
    if (sq && !s.party_name?.toLowerCase().includes(sq) && !s.standardized_product_name?.toLowerCase().includes(sq)) return false;
    return inPeriod(s, range);
  });
}

function emptyCounts() {
  return { demandSignals: 0, openRequirements: 0, activeIntents: 0, completedTransactions: 0, uniqueCustomers: 0 };
}

/** Summary counts. Input should already be deduplicated (applyFilters does this). */
export function summarize(signals) {
  const c = emptyCounts();
  const customers = new Set();
  (signals || []).forEach((s) => {
    c.demandSignals++;
    if (isOpenRequirement(s)) c.openRequirements++;
    if (isActiveIntent(s)) c.activeIntents++;
    if (isTransaction(s)) c.completedTransactions++;
    if (s.party_id) customers.add(s.party_id);
  });
  c.uniqueCustomers = customers.size;
  return c;
}

/** One row per territory (including Unassigned), sorted by demand signals then name. */
export function aggregateByTerritory(signals) {
  const groups = new Map();
  (signals || []).forEach((s) => {
    const t = territoryOf(s);
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(s);
  });
  return [...groups.entries()]
    .map(([territory, rows]) => ({ territory, ...summarize(rows) }))
    .sort((a, b) => b.demandSignals - a.demandSignals || a.territory.localeCompare(b.territory));
}

/** 0 (none) … 4 (highest) relative to the largest territory value. */
export function intensityLevel(value, max) {
  if (!value || !max || value <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)));
}

const byDateDesc = (a, b) => (toMs(b.signal_date) || 0) - (toMs(a.signal_date) || 0);

/** Drill-down for one territory from the already-filtered signals. */
export function territoryDetail(signals, territory, { limit = 8 } = {}) {
  const rows = (signals || []).filter((s) => territoryOf(s) === territory);
  const products = new Map();
  rows.filter(hasRealProduct).forEach((s) => {
    const name = s.standardized_product_name || s.product_reference || 'Unknown';
    if (!products.has(name)) products.set(name, { name, category: s.product_category || 'Uncategorized', signals: 0, openRequirements: 0, activeIntents: 0 });
    const p = products.get(name);
    p.signals++;
    if (isOpenRequirement(s)) p.openRequirements++;
    if (isActiveIntent(s)) p.activeIntents++;
  });
  const customers = new Map();
  rows.forEach((s) => {
    if (!s.party_id) return;
    if (!customers.has(s.party_id)) customers.set(s.party_id, { party_id: s.party_id, party_name: s.party_name || 'Unknown customer', signals: 0 });
    customers.get(s.party_id).signals++;
  });
  return {
    territory,
    summary: summarize(rows),
    topProducts: [...products.values()].sort((a, b) => b.signals - a.signals || a.name.localeCompare(b.name)).slice(0, 5),
    openRequirements: rows.filter(isOpenRequirement).sort(byDateDesc).slice(0, limit),
    activeIntents: rows.filter(isActiveIntent).sort(byDateDesc).slice(0, limit),
    transactions: rows.filter(isTransaction).sort(byDateDesc).slice(0, limit),
    recentActivity: rows.filter(hasRealDate).sort(byDateDesc).slice(0, limit),
    customers: [...customers.values()].sort((a, b) => b.signals - a.signals || a.party_name.localeCompare(b.party_name)).slice(0, limit),
  };
}

/** Requirement-backed signals link to the requirement page; others don't. */
export const requirementLink = (s) => (hasRealProduct(s) && s.source_id ? `/requirements/${s.source_id}` : null);
export const customerLink = (s) => (s.party_id ? `/customers/${s.party_id}` : null);

/**
 * Actionable insights from real records only.
 *  filtered: signals after all shared filters (what the user is looking at)
 *  all:      every loaded signal (used only to look up later transactions and the
 *            previous period, so a signal-type or period filter cannot hide them)
 */
export function buildInsights({ filtered, all, filters = {}, now = new Date() }) {
  const out = [];

  // 1. Products with 2+ unresolved requirements in the same territory.
  const unresolved = new Map();
  (filtered || []).filter(isOpenRequirement).forEach((s) => {
    const product = s.standardized_product_name || s.product_reference || 'Unknown';
    const key = `${territoryOf(s)}|${product}`;
    if (!unresolved.has(key)) unresolved.set(key, { territory: territoryOf(s), product, records: [] });
    unresolved.get(key).records.push(s);
  });
  [...unresolved.values()].filter((g) => g.records.length >= 2)
    .sort((a, b) => b.records.length - a.records.length)
    .forEach((g) => out.push({
      kind: 'UNRESOLVED_REQUIREMENTS',
      territory: g.territory,
      title: `${g.records.length} open requirements for ${g.product}`,
      detail: `${g.territory} has ${g.records.length} unresolved requirements for this product.`,
      records: g.records.sort(byDateDesc),
    }));

  // 2. Active buying intents with no completed transaction from that customer since the intent.
  const txByParty = new Map();
  (all || []).filter(isTransaction).forEach((t) => {
    const ms = toMs(t.signal_date);
    if (!t.party_id || ms === null) return;
    txByParty.set(t.party_id, Math.max(txByParty.get(t.party_id) || 0, ms));
  });
  const unconverted = (filtered || []).filter(isActiveIntent).filter((s) => {
    const last = txByParty.get(s.party_id);
    return !last || last < (toMs(s.signal_date) || 0);
  }).sort(byDateDesc);
  if (unconverted.length) {
    out.push({
      kind: 'INTENT_WITHOUT_TRANSACTION',
      territory: null,
      title: `${unconverted.length} active buying intent${unconverted.length > 1 ? 's' : ''} without a completed transaction`,
      detail: 'No Tally sales voucher from these customers since the intent was recorded.',
      records: unconverted,
    });
  }

  // 3. Territories with increasing demand vs the previous equal period (finite periods only).
  const range = periodRange(filters.period || 'ALL', now);
  if (range.fromMs !== null) {
    const prev = { fromMs: range.fromMs - (range.toMs - range.fromMs), toMs: range.fromMs - 1 };
    const base = applyFilters(all, { ...filters, period: 'ALL', now }).filter(hasRealDate);
    const count = (r) => {
      const m = new Map();
      base.filter((s) => inPeriod(s, r)).forEach((s) => m.set(territoryOf(s), (m.get(territoryOf(s)) || 0) + 1));
      return m;
    };
    const cur = count(range);
    const before = count(prev);
    [...cur.entries()].forEach(([territory, n]) => {
      const p = before.get(territory) || 0;
      if (p >= 3 && n - p >= 2 && n >= p * 1.25) {
        out.push({
          kind: 'INCREASING_DEMAND',
          territory,
          title: `Demand rising in ${territory}`,
          detail: `${n} signals vs ${p} in the previous ${range.days} days.`,
          records: [],
        });
      }
    });
  }
  return out;
}

/** True when the loaded data may be truncated by the API row limit. */
export const mayBeTruncated = (rawCount) => rawCount >= ROW_LIMIT_HINT;
