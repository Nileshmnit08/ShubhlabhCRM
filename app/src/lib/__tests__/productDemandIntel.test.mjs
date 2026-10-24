/**
 * PDM-UI-REFERENCE-MATCH-01 unit tests (real module, synthetic rows shaped like enriched v_demand_signals).
 * Run: node --test app/src/lib/__tests__/productDemandIntel.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SIGNAL, applyFilters } from '../territoryDemand.js';
import {
  trendStatus, windowCounts, weeklySeries, productStats, territoryRanking, locationRanking, topWithOthers,
  intensityColor, statusDistribution, customerRows, filterAndSortCustomers, quickInsights, customersToCsv,
  productSignals, LOCATION_NOT_RECORDED,
} from '../productDemandIntel.js';

const NOW = Date.parse('2026-10-24T06:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString();
let seq = 0;
const sig = (o) => ({
  signal_type: SIGNAL.REQUIREMENT, source_id: `r${++seq}`, party_id: 'p1', party_name: 'Agro One',
  signal_date: daysAgo(5), product_reference: 'Pellets', standardized_product_name: 'Pellets',
  product_category: 'Feed', signal_status: 'New', territory_name: 'Jaipur', location_label: 'Jaipur, Rajasthan', ...o,
});

function dataset() {
  seq = 0;
  return [
    // Pellets: 4 in last 30 days, 2 in the 30 before
    sig({ party_id: 'p1' }), sig({ party_id: 'p2', party_name: 'Beta Dairy', location_label: 'Kota, Rajasthan', territory_name: 'Kota' }),
    sig({ signal_type: SIGNAL.INTENT, party_id: 'p3', party_name: 'Gamma Feeds', signal_status: 'Negotiation', signal_date: daysAgo(10) }),
    sig({ party_id: 'p1', signal_status: 'Closed', signal_date: daysAgo(20) }),
    sig({ party_id: 'p4', party_name: 'Delta Agro', location_label: null, territory_name: null, signal_date: daysAgo(40) }),
    sig({ signal_type: SIGNAL.INTENT, party_id: 'p2', party_name: 'Beta Dairy', signal_status: 'Lost', signal_date: daysAgo(45), location_label: 'Kota, Rajasthan', territory_name: 'Kota' }),
    // Dalia: 1 recent
    sig({ standardized_product_name: 'Dalia', product_reference: 'Dalia', party_id: 'p5', party_name: 'Eps Traders', location_label: 'Indore, Madhya Pradesh', territory_name: 'Indore' }),
    // Not products
    sig({ signal_type: SIGNAL.TRANSACTION, party_id: 'p1', standardized_product_name: 'AGRO ONE LEDGER', product_reference: 'AGRO ONE LEDGER', product_category: 'Uncategorized', signal_status: 'Closed', signal_date: daysAgo(2) }),
    sig({ signal_type: SIGNAL.REPEAT, source_id: 'p1', party_id: 'p1', standardized_product_name: 'Historical Pattern', product_reference: 'Historical Pattern', signal_status: 'Validated', signal_date: new Date(NOW).toISOString() }),
  ];
}

test('trend status: neutral states instead of misleading percentages', () => {
  assert.deepEqual(trendStatus(0, 0), { status: 'No recent demand', pct: null, tone: 'neutral' });
  assert.equal(trendStatus(5, 0).status, 'New');
  assert.equal(trendStatus(2, 1).status, 'Limited data');
  assert.deepEqual(trendStatus(4, 2), { status: 'Growing', pct: 100, tone: 'up' });
  assert.equal(trendStatus(2, 4).status, 'Declining');
  assert.equal(trendStatus(10, 9).status, 'Stable');
});

test('product stats: real products only, distinct metrics, trend vs previous equal window', () => {
  const all = dataset();
  const filtered = applyFilters(all, { now: new Date(NOW) });
  const stats = productStats(filtered, filtered, { endMs: NOW, compareDays: 30 });
  assert.deepEqual(stats.map((s) => s.name), ['Pellets', 'Dalia'], 'ledger names and Historical Pattern are never products');
  const p = stats[0];
  assert.equal(p.total, 6);
  assert.equal(p.openRequirements, 3, 'p1, p2, p4 open; the Closed one excluded');
  assert.equal(p.activeIntents, 1, 'Lost excluded');
  assert.equal(p.customers, 4);
  assert.equal(p.locations, 2, 'only recorded locations count');
  assert.deepEqual([p.current, p.previous, p.pct, p.status], [4, 2, 100, 'Growing']);
  assert.equal(stats[1].status, 'New');
  assert.deepEqual(windowCounts(productSignals(filtered), NOW, 30), { current: 5, previous: 2 });
});

test('weekly series: 12 buckets, counts land in the right week, metric filter', () => {
  const rows = productSignals(dataset());
  const ws = weeklySeries(rows, ['Pellets', 'Dalia'], { endMs: NOW, weeks: 12 });
  assert.equal(ws.length, 12);
  assert.equal(ws.reduce((n, b) => n + b.Pellets, 0), 6, 'all 6 Pellets signals within 12 weeks');
  assert.equal(ws[11].Pellets, 2, 'two 5-day-old signals in the latest week');
  const open = weeklySeries(rows, ['Pellets'], { endMs: NOW, metric: 'open' });
  assert.equal(open.reduce((n, b) => n + b.Pellets, 0), 3);
  const empty = weeklySeries([], ['Pellets'], { endMs: NOW });
  assert.equal(empty.every((b) => b.Pellets === 0), true);
});

test('territory and location rankings reconcile, incl. Others and unrecorded', () => {
  const rows = applyFilters(dataset(), { now: new Date(NOW) });
  const terr = territoryRanking(rows);
  assert.equal(terr.reduce((n, r) => n + r.value, 0), rows.length, 'every signal counted once');
  assert.ok(terr.find((r) => r.name === 'Unassigned'));
  const loc = locationRanking(rows);
  assert.equal(loc.rows.reduce((n, r) => n + r.value, 0) + loc.unrecorded, rows.length);
  assert.equal(loc.unrecorded, 1);
  assert.equal(loc.rows.find((r) => r.name === LOCATION_NOT_RECORDED), undefined, 'no fake location bucket');
  const custs = locationRanking(rows, 'customers');
  assert.equal(custs.rows.find((r) => r.name === 'Jaipur, Rajasthan').value, 2);
  const many = Array.from({ length: 10 }, (_, i) => ({ name: `T${i}`, value: 10 - i }));
  const top = topWithOthers(many, 7);
  assert.equal(top.length, 8);
  assert.equal(top[7].name, 'Others');
  assert.equal(top.reduce((n, r) => n + r.value, 0), many.reduce((n, r) => n + r.value, 0), 'Others keeps totals reconciled');
  assert.equal(intensityColor(0), '#f1f5f9');
  assert.equal(intensityColor(25), '#1e40af');
});

test('status distribution is mutually exclusive and sums to the product total', () => {
  const pellets = productSignals(dataset()).filter((s) => s.standardized_product_name === 'Pellets');
  const d = statusDistribution(pellets);
  assert.equal(d.total, 6);
  assert.equal(d.buckets.reduce((n, b) => n + b.value, 0), d.total);
  assert.deepEqual(d.buckets.map((b) => [b.key, b.value]), [['open', 3], ['closedReq', 1], ['intent', 1], ['closedIntent', 1]]);
  assert.equal(d.buckets.reduce((n, b) => n + b.pct, 0), 100);
  assert.equal(statusDistribution([]).total, 0);
});

test('customer rows: one per customer, latest signal, status, requirement link id', () => {
  const rows = customerRows(applyFilters(dataset(), { now: new Date(NOW) }));
  const p1 = rows.find((r) => r.partyId === 'p1');
  assert.equal(p1.total, 4, 'requirement + closed requirement + transaction + repeat pattern');
  assert.equal(p1.status, 'Open requirement');
  assert.equal(p1.latestSignal, 'Transaction', 'latest dated signal (repeat pattern has no real date)');
  assert.ok(p1.latestRequirementId, 'links to its latest requirement');
  const p4 = rows.find((r) => r.partyId === 'p4');
  assert.equal(p4.location, null);
  assert.equal(p4.territory, 'Unassigned');
  const p2 = rows.find((r) => r.partyId === 'p2');
  assert.equal(p2.status, 'Open requirement');
});

test('customer search, status filter and sorting', () => {
  const rows = customerRows(applyFilters(dataset(), { now: new Date(NOW) }));
  assert.deepEqual(filterAndSortCustomers(rows, { search: 'kota' }).map((r) => r.partyId), ['p2']);
  assert.deepEqual(filterAndSortCustomers(rows, { search: 'dalia' }).map((r) => r.partyId), ['p5'], 'search by product');
  assert.equal(filterAndSortCustomers(rows, { status: 'Active intent' }).every((r) => r.status === 'Active intent'), true);
  const byDate = filterAndSortCustomers(rows, { sort: 'lastDate' });
  for (let i = 1; i < byDate.length; i++) assert.ok((byDate[i - 1].lastMs ?? -Infinity) >= (byDate[i].lastMs ?? -Infinity));
  const byName = filterAndSortCustomers(rows, { sort: 'name' }).map((r) => r.name);
  assert.deepEqual(byName, [...byName].sort((a, b) => a.localeCompare(b)));
  assert.equal(filterAndSortCustomers(rows, { sort: 'signals' })[0].partyId, 'p1');
});

test('quick insights use actual counts; no claim without history', () => {
  const filtered = applyFilters(dataset(), { now: new Date(NOW) });
  const [pellets] = productStats(filtered, filtered, { endMs: NOW });
  const rows = productSignals(filtered).filter((s) => s.standardized_product_name === 'Pellets');
  const ins = quickInsights(pellets, rows);
  assert.match(ins[0].text, /increased by 100%.*4 vs 2/);
  assert.match(ins[1].text, /^4 unique customers/);
  assert.match(ins[2].text, /^2 locations/);
  assert.match(ins[3].text, /^3 open requirements/);
  const none = quickInsights({ pct: null, status: 'No recent demand', current: 0 }, []);
  assert.match(none[0].text, /No recent demand recorded/);
  assert.equal(none.some((i) => /no market demand/i.test(i.text)), false);
});

test('CSV export escapes values and matches the visible rows', () => {
  const rows = [{ name: 'Sharma, "Feeds"', location: null, territory: 'Kota', total: 2, openRequirements: 1, activeIntents: 0, lastMs: NOW, latestSignal: 'Open requirement', latestProduct: 'Pellets', status: 'Open requirement' }];
  const csv = customersToCsv(rows, () => '24 Oct 2026');
  const [header, line] = csv.split('\n');
  assert.match(header, /^#,Customer,Location,Territory/);
  assert.equal(line, '1,"Sharma, ""Feeds""",Location not recorded,Kota,2,1,0,24 Oct 2026,Open requirement (Pellets),Open requirement');
});
