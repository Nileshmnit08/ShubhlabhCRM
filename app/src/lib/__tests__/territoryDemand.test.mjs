/**
 * PDM-TERRITORY-INTELLIGENCE-01 unit tests (real module, synthetic rows shaped like v_demand_signals).
 * Run: node --test app/src/lib/__tests__/territoryDemand.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  SIGNAL, UNASSIGNED, applyFilters, dedupeSignals, summarize, aggregateByTerritory, intensityLevel,
  territoryDetail, buildInsights, periodRange, requirementLink, customerLink, mayBeTruncated, METRICS,
} from '../territoryDemand.js';

const NOW = new Date('2026-10-24T06:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();
let seq = 0;
const sig = (o) => ({
  signal_type: SIGNAL.REQUIREMENT,
  source_id: `r${++seq}`,
  party_id: 'p1',
  party_name: 'Agro One',
  signal_date: daysAgo(5),
  product_reference: 'Cattle Feed 50kg',
  standardized_product_name: 'Cattle Feed 50kg',
  product_category: 'Feed',
  signal_status: 'New',
  territory_name: 'Jaipur',
  ...o,
});

function dataset() {
  seq = 0;
  return [
    sig({ party_id: 'p1' }),                                                         // Jaipur open req
    sig({ party_id: 'p2', party_name: 'Dairy Two' }),                                // Jaipur open req (same product)
    sig({ party_id: 'p2', signal_status: 'Closed' }),                                // Jaipur closed req
    sig({ signal_type: SIGNAL.INTENT, party_id: 'p3', party_name: 'Milk Three', signal_status: 'Negotiation' }), // Jaipur active intent
    sig({ signal_type: SIGNAL.INTENT, party_id: 'p3', signal_status: 'Lost' }),     // Jaipur lost intent
    sig({ signal_type: SIGNAL.TRANSACTION, party_id: 'p1', product_reference: 'AGRO ONE LEDGER', standardized_product_name: 'AGRO ONE LEDGER', product_category: 'Uncategorized', signal_status: 'Closed', signal_date: daysAgo(2) }),
    sig({ signal_type: SIGNAL.REPEAT, source_id: 'p1', party_id: 'p1', product_reference: 'Historical Pattern', standardized_product_name: 'Historical Pattern', product_category: 'Uncategorized', signal_status: 'Validated', signal_date: NOW.toISOString() }),
    sig({ territory_name: 'Ajmer', party_id: 'p4', party_name: 'Ajmer Feeds', product_category: 'Supplements', standardized_product_name: 'Mineral Mix', signal_date: daysAgo(40) }),
    sig({ territory_name: null, party_id: 'p5', party_name: 'No Territory Co', signal_date: daysAgo(100) }),
  ];
}

// The original ProductDemand filter (before this sprint), for regression comparison.
const legacyFilter = (signals, { territory, signalType, search }) => signals.filter((s) => {
  if (territory !== 'All' && (s.territory_name || 'Unassigned') !== territory) return false;
  if (signalType !== 'All' && s.signal_type !== signalType) return false;
  if (search) {
    const sq = search.toLowerCase();
    if (!s.party_name?.toLowerCase().includes(sq) && !s.standardized_product_name?.toLowerCase().includes(sq)) return false;
  }
  return true;
});

test('default filters reproduce the original Product Demand Matrix behaviour', () => {
  const data = dataset();
  for (const f of [
    { territory: 'All', signalType: 'All', search: '' },
    { territory: 'Jaipur', signalType: 'All', search: '' },
    { territory: 'Unassigned', signalType: 'All', search: '' },
    { territory: 'All', signalType: SIGNAL.INTENT, search: '' },
    { territory: 'All', signalType: 'All', search: 'dairy' },
  ]) {
    assert.deepEqual(applyFilters(data, { ...f, now: NOW }).map((s) => s.source_id), legacyFilter(data, f).map((s) => s.source_id), JSON.stringify(f));
  }
});

test('territory grouping and aggregation, incl. Unassigned', () => {
  const rows = aggregateByTerritory(applyFilters(dataset(), { now: NOW }));
  const jaipur = rows.find((r) => r.territory === 'Jaipur');
  assert.deepEqual(
    { d: jaipur.demandSignals, o: jaipur.openRequirements, i: jaipur.activeIntents, t: jaipur.completedTransactions, c: jaipur.uniqueCustomers },
    { d: 7, o: 2, i: 1, t: 1, c: 3 }
  );
  assert.equal(rows[0].territory, 'Jaipur', 'sorted by demand');
  assert.ok(rows.find((r) => r.territory === UNASSIGNED), 'missing territory grouped as Unassigned');
});

test('map, graph and summary counts are consistent', () => {
  const filtered = applyFilters(dataset(), { now: NOW });
  const total = summarize(filtered);
  const rows = aggregateByTerritory(filtered);
  for (const m of METRICS.map((x) => x.key)) {
    assert.equal(rows.reduce((n, r) => n + r[m], 0), total[m], m);
  }
  assert.equal(total.demandSignals, filtered.length);
});

test('no double counting: duplicate rows of the same signal are counted once', () => {
  const data = dataset();
  const dup = [...data, { ...data[0] }, { ...data[3] }];
  assert.equal(dedupeSignals(dup).length, data.length);
  assert.deepEqual(summarize(applyFilters(dup, { now: NOW })), summarize(applyFilters(data, { now: NOW })));
  // A requirement is either a stated requirement or an intent, never both.
  const s = summarize(applyFilters(data, { now: NOW }));
  assert.equal(s.openRequirements + s.activeIntents <= s.demandSignals, true);
});

test('open requirement / active intent use the v_open_requirements status rule', () => {
  const s = summarize(applyFilters(dataset(), { territory: 'Jaipur', now: NOW }));
  assert.equal(s.openRequirements, 2, 'Closed excluded');
  assert.equal(s.activeIntents, 1, 'Lost excluded');
  assert.equal(summarize([sig({ signal_status: 'Confirmed' })]).openRequirements, 0, 'Confirmed excluded');
});

test('period filter: date-bounded, excludes synthetic-date repeat-purchase signals', () => {
  const d30 = applyFilters(dataset(), { period: 'D30', now: NOW });
  assert.equal(d30.some((s) => s.signal_type === SIGNAL.REPEAT), false);
  assert.equal(d30.some((s) => s.territory_name === 'Ajmer'), false, '40 days ago excluded');
  assert.equal(applyFilters(dataset(), { period: 'D90', now: NOW }).some((s) => s.territory_name === 'Ajmer'), true);
  assert.equal(applyFilters(dataset(), { period: 'ALL', now: NOW }).length, dataset().length);
  assert.equal(periodRange('ALL', NOW).fromMs, null);
});

test('category and signal-type filters', () => {
  assert.deepEqual(applyFilters(dataset(), { category: 'Supplements', now: NOW }).map((s) => s.territory_name), ['Ajmer']);
  const tx = applyFilters(dataset(), { signalType: SIGNAL.TRANSACTION, now: NOW });
  assert.equal(tx.length, 1);
  assert.equal(summarize(tx).completedTransactions, 1);
});

test('empty input and missing location values are safe', () => {
  assert.deepEqual(summarize([]), { demandSignals: 0, openRequirements: 0, activeIntents: 0, completedTransactions: 0, uniqueCustomers: 0 });
  assert.deepEqual(aggregateByTerritory([]), []);
  const detail = territoryDetail([], 'Jaipur');
  assert.equal(detail.summary.demandSignals, 0);
  const unassigned = territoryDetail(applyFilters(dataset(), { now: NOW }), UNASSIGNED);
  assert.equal(unassigned.summary.demandSignals, 1);
  assert.equal(intensityLevel(0, 10), 0);
  assert.equal(intensityLevel(10, 10), 4);
  assert.equal(intensityLevel(1, 10), 1);
});

test('drill-down: top products use real products only; lists and links', () => {
  const d = territoryDetail(applyFilters(dataset(), { now: NOW }), 'Jaipur');
  assert.deepEqual(d.topProducts.map((p) => p.name), ['Cattle Feed 50kg'], 'ledger names and Historical Pattern are not products');
  assert.equal(d.topProducts[0].openRequirements, 2);
  assert.equal(d.openRequirements.length, 2);
  assert.equal(d.activeIntents.length, 1);
  assert.equal(d.transactions.length, 1);
  assert.equal(d.recentActivity.some((s) => s.signal_type === SIGNAL.REPEAT), false);
  assert.equal(d.summary.uniqueCustomers, 3);
  assert.equal(requirementLink(d.openRequirements[0]), `/requirements/${d.openRequirements[0].source_id}`);
  assert.equal(requirementLink(d.transactions[0]), null, 'transactions do not link to a requirement page');
  assert.equal(customerLink(d.transactions[0]), '/customers/p1');
});

test('insights: unresolved requirements, unconverted intents, rising demand — real records only', () => {
  seq = 100;
  const data = dataset();
  const filters = { period: 'ALL' };
  const ins = buildInsights({ filtered: applyFilters(data, { ...filters, now: NOW }), all: data, filters, now: NOW });
  const unresolved = ins.find((i) => i.kind === 'UNRESOLVED_REQUIREMENTS');
  assert.equal(unresolved.records.length, 2);
  assert.equal(unresolved.territory, 'Jaipur');
  const intents = ins.find((i) => i.kind === 'INTENT_WITHOUT_TRANSACTION');
  assert.equal(intents.records.length, 1, 'p3 has no transaction');
  assert.equal(ins.some((i) => i.kind === 'INCREASING_DEMAND'), false, 'no trend for all-time');
  assert.equal(ins.some((i) => /high opportunity/i.test(i.title)), false);

  // An intent followed by a transaction from the same customer is not flagged.
  const converted = [sig({ signal_type: SIGNAL.INTENT, party_id: 'p9', source_id: 'x1', signal_date: daysAgo(10) }),
    sig({ signal_type: SIGNAL.TRANSACTION, party_id: 'p9', source_id: 'x2', signal_date: daysAgo(3), signal_status: 'Closed' })];
  assert.equal(buildInsights({ filtered: converted, all: converted, filters, now: NOW }).some((i) => i.kind === 'INTENT_WITHOUT_TRANSACTION'), false);

  // Rising demand: 5 signals in the last 30 days vs 3 in the previous 30.
  const trend = [
    ...[3, 5, 8, 12, 20].map((d, i) => sig({ source_id: `c${i}`, signal_date: daysAgo(d), territory_name: 'Kota' })),
    ...[35, 40, 50].map((d, i) => sig({ source_id: `q${i}`, signal_date: daysAgo(d), territory_name: 'Kota' })),
  ];
  const tf = { period: 'D30' };
  const rising = buildInsights({ filtered: applyFilters(trend, { ...tf, now: NOW }), all: trend, filters: tf, now: NOW });
  const r = rising.find((i) => i.kind === 'INCREASING_DEMAND');
  assert.ok(r, 'rising demand detected');
  assert.match(r.detail, /5 signals vs 3/);
  // Too little history: no trend claim.
  const thin = trend.slice(0, 6);
  assert.equal(buildInsights({ filtered: applyFilters(thin, { ...tf, now: NOW }), all: thin, filters: tf, now: NOW }).some((i) => i.kind === 'INCREASING_DEMAND'), false);
});

test('explicit date range filter (IST day bounds) overrides period and excludes synthetic dates', async () => {
  const { dateRangeBounds } = await import('../territoryDemand.js');
  const data = dataset();
  const from = new Date(NOW.getTime() - 10 * 86400000).toISOString().slice(0, 10);
  const to = NOW.toISOString().slice(0, 10);
  const inRange = applyFilters(data, { dateFrom: from, dateTo: to, period: 'D365', now: NOW });
  assert.equal(inRange.some((s) => s.signal_type === SIGNAL.REPEAT), false);
  assert.equal(inRange.some((s) => s.territory_name === 'Ajmer'), false, '40 days ago is outside the range');
  assert.equal(dateRangeBounds('', '', NOW), null, 'empty range = all time');
  assert.equal(applyFilters(data, { dateFrom: '', dateTo: '', now: NOW }).length, data.length);
});

test('truncation hint at the API row limit', () => {
  assert.equal(mayBeTruncated(999), false);
  assert.equal(mayBeTruncated(1000), true);
});

test('page wiring (PDM-UI-REFERENCE-MATCH-01): paged loading, shared applied filters, dashboard never queries', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const page = readFileSync(path.join(here, '../../pages/ProductDemand.jsx'), 'utf8');
  assert.match(page, /\.range\(from, from \+ PAGE_SIZE - 1\)/, 'signals are paginated (no silent 1,000-row cap)');
  assert.match(page, /\.order\('source_id'/, 'deterministic paging order');
  assert.match(page, /applyFilters\(signals, applied\)/, 'product table uses the applied filters');
  assert.match(page, /filters=\{applied\}/, 'dashboard uses the same applied filters');
  assert.match(page, /42501/);
  for (const f of ['ProductDemandDashboard.jsx', 'DemandPanels.jsx', 'CustomerDemandTable.jsx']) {
    const src = readFileSync(path.join(here, `../../components/productDemand/${f}`), 'utf8');
    assert.equal(/supabase/.test(src), false, `${f} never queries on its own`);
  }
});
