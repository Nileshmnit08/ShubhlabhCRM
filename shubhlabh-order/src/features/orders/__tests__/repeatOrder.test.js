// SL-ORDER-REPEAT-ORDER-02 — Repeat Order: acceptance tests A–O.
// Runs the REAL orderNormalizer / repeatOrder / orderSubmission modules against an in-memory fake of the
// Supabase tables the app uses (requirements, requirement_items, activity_logs) with the buyer RLS rules of
// migration 224 (own rows only; no DELETE on requirement_items). The data is SYNTHETIC, shaped from the
// migrations and the mapping-contract doc — it is not a copy of production rows.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '../../../..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// ---------------------------------------------------------------- fake database
function makeDb(seed) {
  const tables = { requirements: [], requirement_items: [], activity_logs: [] };
  for (const [k, v] of Object.entries(seed)) tables[k] = v.map((r) => ({ ...r }));
  const log = [];
  const faults = { itemsInsert: 0, headerInsert: 0 };
  let seq = 100;
  let clock = Date.parse('2026-11-01T10:00:00Z');

  const clientFor = (authParty) => ({
    from(table) {
      const q = { table, op: 'select', payload: null, filters: [], embed: false, limit: null, single: null, sort: false };
      const visible = () => {
        if (table === 'requirements') return tables.requirements.filter((r) => r.party_id === authParty);
        if (table === 'requirement_items') {
          const own = new Set(tables.requirements.filter((r) => r.party_id === authParty).map((r) => r.id));
          return tables.requirement_items.filter((i) => own.has(i.requirement_id));
        }
        return tables[table];
      };
      const run = () => {
        log.push({ op: q.op, table, filters: q.filters.map((f) => [...f]), payload: q.payload });
        const match = (r) => q.filters.every(([c, v]) => r[c] === v);
        let rows;
        if (q.op === 'select') {
          rows = visible().filter(match).map((r) => ({ ...r }));
          if (q.embed) rows = rows.map((r) => ({ ...r, requirement_items: tables.requirement_items.filter((i) => i.requirement_id === r.id && authParty === r.party_id).map((i) => ({ ...i })) }));
          if (q.sort) rows.sort((a, b) => b.created_at - a.created_at);
          if (q.limit) rows = rows.slice(0, q.limit);
        } else if (q.op === 'insert') {
          const list = Array.isArray(q.payload) ? q.payload : [q.payload];
          if (table === 'requirements') {
            if (faults.headerInsert > 0) { faults.headerInsert--; return { data: null, error: { message: 'network down' } }; }
            if (list.some((r) => r.party_id !== authParty)) return { data: null, error: { message: 'new row violates row-level security policy' } };
            rows = list.map((r) => { const row = { ...r, id: `req-${++seq}`, demand_ref: `DR-${seq}`, created_at: (clock += 1000) }; tables.requirements.push(row); return { ...row }; });
          } else if (table === 'requirement_items') {
            if (faults.itemsInsert > 0) { faults.itemsInsert--; return { data: null, error: { message: 'connection lost' } }; }
            const own = new Set(tables.requirements.filter((r) => r.party_id === authParty).map((r) => r.id));
            if (list.some((i) => !own.has(i.requirement_id))) return { data: null, error: { message: 'new row violates row-level security policy' } };
            rows = list.map((r) => { const row = { ...r, id: `item-${++seq}` }; tables.requirement_items.push(row); return { ...row }; });
          } else {
            rows = list.map((r) => { const row = { ...r, id: `log-${++seq}` }; tables[table].push(row); return row; });
          }
        } else if (q.op === 'update') {
          rows = visible().filter(match);
          rows.forEach((r) => Object.assign(r, q.payload));
          rows = rows.map((r) => ({ ...r }));
        } else if (q.op === 'delete') {
          if (table === 'requirement_items') return { data: null, error: { message: 'permission denied (no DELETE policy for buyers)' } };
          rows = [];
        }
        if (q.single === 'one') {
          if (rows.length !== 1) return { data: null, error: { message: `expected 1 row, got ${rows.length}` } };
          return { data: rows[0], error: null };
        }
        if (q.single === 'maybe') return { data: rows[0] || null, error: null };
        return { data: rows, error: null };
      };
      const api = {
        select(cols) { if (typeof cols === 'string' && cols.includes('requirement_items')) q.embed = true; return api; },
        insert(p) { q.op = 'insert'; q.payload = p; return api; },
        update(p) { q.op = 'update'; q.payload = p; return api; },
        delete() { q.op = 'delete'; return api; },
        eq(c, v) { q.filters.push([c, v]); return api; },
        order() { q.sort = true; return api; },
        limit(n) { q.limit = n; return api; },
        single() { q.single = 'one'; return api; },
        maybeSingle() { q.single = 'maybe'; return api; },
        then(res, rej) { return Promise.resolve(run()).then(res, rej); },
      };
      return api;
    },
  });
  return { tables, log, faults, clientFor };
}

const P1 = { id: 'party-1', city: 'Indore', display_name: 'Customer One' };
const P2 = { id: 'party-2', city: 'Bhopal', display_name: 'Customer Two' };
const session = (p) => ({ user: { id: `auth-${p.id}`, user_metadata: {} } });

const CATALOGUE = [
  { id: 'p-wheat-a', name: 'Wheat Grade A', category: 'Wheat', active: true },
  { id: 'p-wheat-b', name: 'Wheat Grade B', category: 'Wheat', active: true },
  { id: 'p-rice', name: 'Basmati Rice', category: 'Rice', active: true },
  { id: 'p-sugar', name: 'Sugar', category: 'Sugar', active: true },
  { id: 'p-old', name: 'Old Brand Atta', category: 'Atta', active: false },
];

const seed = () => ({
  requirements: [
    { id: 'req-1', party_id: 'party-1', status: 'Confirmed', unit: 'Bags', demand_ref: 'DR-001', created_at: 1, notes: JSON.stringify({ address: 'Shop 4, Mandi Road, Indore', client_reference_id: 'ref-OLD-1' }), assigned_to: 'sales-9' },
    { id: 'req-2', party_id: 'party-2', status: 'New', unit: 'Bags', demand_ref: 'DR-002', created_at: 2, notes: JSON.stringify({ address: 'Other customer address', client_reference_id: 'ref-OLD-2' }) },
  ],
  requirement_items: [
    { id: 'it-1', requirement_id: 'req-1', product_name: 'Wheat Grade A', category: 'Wheat', quantity: 37, unit: 'Bags', weight: 50, gift: null, other_gift: null },
    { id: 'it-2', requirement_id: 'req-1', product_name: 'Wheat Grade A', category: 'Wheat', quantity: 12, unit: 'Bags', weight: 25, gift: 'Others', other_gift: 'Steel Glass' },
    { id: 'it-3', requirement_id: 'req-1', product_name: 'Wheat Grade B', category: 'Wheat', quantity: 5, unit: 'Bags', weight: 50, gift: 'Bucket', other_gift: null },
    { id: 'it-4', requirement_id: 'req-1', product_name: 'Basmati Rice', category: 'Rice', quantity: 140, unit: 'Bags', weight: 10, gift: null, other_gift: null },
    { id: 'it-9', requirement_id: 'req-2', product_name: 'Sugar', category: 'Sugar', quantity: 3, unit: 'Bags', weight: 50, gift: null, other_gift: null },
  ],
});

async function mods() {
  const [rep, sub, norm] = await Promise.all([load('src/features/orders/repeatOrder.js'), load('src/features/orders/orderSubmission.js'), load('src/features/orders/orderNormalizer.js')]);
  return { rep, sub, norm };
}

// The steps the NewOrder screen performs for a repeat: fetch (ownership checked) → build the draft.
async function startRepeat(m, db, party, orderId, catalogue = CATALOGUE) {
  const client = db.clientFor(party.id);
  const order = await m.rep.fetchOrderForRepeat(client, orderId, party.id);
  const draft = m.rep.buildRepeatDraft({ order, customerProfile: party, catalogue });
  return { client, order, draft };
}
const submitDraft = (m, ctx, party, draft, extra = {}) => m.sub.submitOrder({
  client: ctx.client, session: session(party), customerProfile: party, items: draft.items, mode: 'reorder',
  clientReferenceId: draft.clientReferenceId, address: draft.deliveryAddress, ...extra,
});
const snapshot = (db, id) => JSON.stringify({
  header: db.tables.requirements.find((r) => r.id === id),
  items: db.tables.requirement_items.filter((i) => i.requirement_id === id),
});

describe('SL-ORDER-REPEAT-ORDER-02 acceptance tests', () => {
  it('A. single product: the exact quantity and packaging are copied (not reset to 1 / 50)', async () => {
    const m = await mods();
    const s = seed();
    s.requirement_items = s.requirement_items.filter((i) => i.id === 'it-1' || i.requirement_id === 'req-2');
    const { draft } = await startRepeat(m, makeDb(s), P1, 'req-1');
    assert.equal(draft.items.length, 1);
    assert.deepEqual([draft.items[0].product_name, draft.items[0].category, draft.items[0].quantity, draft.items[0].weight, draft.items[0].unit], ['Wheat Grade A', 'Wheat', 37, 50, 'Bags']);
    assert.equal(draft.items[0].product_id, 'p-wheat-a', 'linked to the LIVE catalogue id');
  });

  it('B. multiple products: every line is present once, in order, with its exact quantity', async () => {
    const m = await mods();
    const { draft } = await startRepeat(m, makeDb(seed()), P1, 'req-1');
    assert.deepEqual(draft.items.map((i) => [i.product_name, i.quantity]), [['Wheat Grade A', 37], ['Wheat Grade A', 12], ['Wheat Grade B', 5], ['Basmati Rice', 140]]);
    assert.equal(new Set(draft.items.map((i) => i.id)).size, 4, 'each line has its own new id');
    assert.ok(draft.items.every((i) => i.id.startsWith('repeat-')), 'no old line id is reused as the line id');
    assert.deepEqual(draft.items.map((i) => i.source_item_id), ['it-1', 'it-2', 'it-3', 'it-4']);
  });

  it('C. different packaging of the same product stays two separate lines (never merged)', async () => {
    const m = await mods();
    const { draft } = await startRepeat(m, makeDb(seed()), P1, 'req-1');
    const wheatA = draft.items.filter((i) => i.product_name === 'Wheat Grade A');
    assert.deepEqual(wheatA.map((i) => [i.weight, i.quantity]), [[50, 37], [25, 12]]);
  });

  it('D. different grades map to their own catalogue product', async () => {
    const m = await mods();
    const { draft } = await startRepeat(m, makeDb(seed()), P1, 'req-1');
    assert.equal(draft.items.find((i) => i.product_name === 'Wheat Grade A').product_id, 'p-wheat-a');
    assert.equal(draft.items.find((i) => i.product_name === 'Wheat Grade B').product_id, 'p-wheat-b');
  });

  it('E. gifts / additional items are copied per line (including "Others" text and gifts kept in notes extras)', async () => {
    const m = await mods();
    const s = seed();
    // legacy shape: the gift lives in notes.extras keyed `${category}_${product_name}` (read by normalizeOrder)
    s.requirements[0].notes = JSON.stringify({ address: 'Shop 4, Mandi Road, Indore', extras: { 'Rice_Basmati Rice': { gift: 'Others', other_gift: 'Umbrella' } } });
    const { draft } = await startRepeat(m, makeDb(s), P1, 'req-1');
    const byIdx = (i) => draft.items[i];
    assert.deepEqual([byIdx(1).gift, byIdx(1).other_gift], ['Others', 'Steel Glass']);
    assert.deepEqual([byIdx(2).gift, byIdx(2).other_gift], ['Bucket', '']);
    assert.deepEqual([byIdx(3).gift, byIdx(3).other_gift], ['Others', 'Umbrella']);
    assert.deepEqual([byIdx(0).gift, byIdx(0).other_gift], [null, ''], 'no gift stays no gift');
  });

  it('F. delivery destination is prefilled from the previous order, and a junk notes blob is not used as an address', async () => {
    const m = await mods();
    const { draft } = await startRepeat(m, makeDb(seed()), P1, 'req-1');
    assert.equal(draft.deliveryAddress, 'Shop 4, Mandi Road, Indore');
    assert.equal(m.rep.cleanAddress('{"client_reference_id":"x"}'), '');
    assert.equal(m.rep.cleanAddress(undefined), '');
    // with no previous address the CURRENT profile address is used, exactly as before
    assert.equal(m.sub.resolveDeliveryAddress({ preferred: '', session: session(P1), customerProfile: P1 }), 'Indore');
    assert.equal(m.sub.resolveDeliveryAddress({ preferred: 'Shop 4', session: session(P1), customerProfile: P1 }), 'Shop 4');
  });

  it('G. price: no price is copied; a change is flagged only when both old line and live product carry a price', async () => {
    const m = await mods();
    const withPrice = CATALOGUE.map((p) => (p.id === 'p-wheat-a' ? { ...p, price: 120 } : p));
    const order = m.norm.normalizeOrder({ ...seed().requirements[0], requirement_items: seed().requirement_items.filter((i) => i.requirement_id === 'req-1').map((i) => (i.id === 'it-1' ? { ...i, price: 100 } : i)) });
    const draft = m.rep.buildRepeatDraft({ order, customerProfile: P1, catalogue: withPrice });
    assert.deepEqual(draft.items[0].notices, [{ code: 'PRICE_CHANGED', previous: 100, current: 120 }]);
    assert.equal(draft.priceChangeCount, 1);
    assert.ok(draft.items.every((i) => !('price' in i)), 'the old price is never carried onto the new line');
    // the production schema has no price column: no notices, no invented numbers
    const plain = m.rep.buildRepeatDraft({ order: m.norm.normalizeOrder({ ...seed().requirements[0], requirement_items: seed().requirement_items.filter((i) => i.requirement_id === 'req-1') }), customerProfile: P1, catalogue: CATALOGUE });
    assert.equal(plain.priceChangeCount, 0);
    // and the submission never writes a price
    assert.ok(!('price' in m.sub.buildItemsPayload('r', draft.items)[0]));
  });

  it('H. inactive / renamed product: shown, explained, never substituted, blocks submission until removed', async () => {
    const m = await mods();
    const s = seed();
    s.requirement_items.push({ id: 'it-5', requirement_id: 'req-1', product_name: 'Old Brand Atta', category: 'Atta', quantity: 9, unit: 'Bags', weight: 30, gift: null, other_gift: null });
    s.requirement_items.push({ id: 'it-6', requirement_id: 'req-1', product_name: 'Vanished Dal', category: 'Dal', quantity: 2, unit: 'Bags', weight: 30, gift: null, other_gift: null });
    const db = makeDb(s);
    const ctx = await startRepeat(m, db, P1, 'req-1');
    const { draft } = ctx;
    const old = draft.items.find((i) => i.product_name === 'Old Brand Atta');
    assert.equal(old.product_id, null);
    assert.equal(old.quantity, 9, 'the quantity is kept so the customer sees what they had');
    assert.equal(draft.unavailableCount, 2);
    assert.equal(m.rep.canSubmitDraft(draft.items), false);
    assert.match(m.rep.describeProblem('PRODUCT_UNAVAILABLE', 'Old Brand Atta'), /Nothing was replaced automatically/);
    assert.ok(draft.items.every((i) => !['Wheat Grade B', 'Basmati Rice'].includes(i.product_name) || i.product_id), 'available lines stay linked');
    // submission refuses and writes nothing
    const before = db.log.length;
    await assert.rejects(() => submitDraft(m, ctx, P1, draft), (e) => e.code === 'INVALID_ITEMS' && /not available/.test(e.message));
    assert.equal(db.log.slice(before).filter((l) => l.op === 'insert').length, 0, 'nothing is inserted while a line is unresolved');
    // the customer removes exactly those lines → submission is allowed
    let items = draft.items;
    for (const name of ['Old Brand Atta', 'Vanished Dal']) items = m.rep.removeLineAt(items, items.findIndex((i) => i.product_name === name));
    assert.equal(items.length, 4);
    assert.equal(m.rep.canSubmitDraft(items), true);
    const result = await submitDraft(m, ctx, P1, { ...draft, items });
    assert.equal(result.created, true);
  });

  it('I. customer editing: changed quantity / removed line / added line is what gets submitted', async () => {
    const m = await mods();
    const db = makeDb(seed());
    const ctx = await startRepeat(m, db, P1, 'req-1');
    let items = ctx.draft.items.map((i) => ({ ...i }));
    items[0].quantity = 40;                              // edit quantity
    items = m.rep.removeLineAt(items, 3);                // remove Basmati
    items.push({ id: 'manual-1', product_id: 'p-sugar', product_name: 'Sugar', category: 'Sugar', quantity: 6, unit: 'Bags', weight: 50, gift: null, other_gift: '' }); // add a product
    assert.equal(m.rep.removeLineAt(ctx.draft.items, 1).filter((i) => i.product_name === 'Wheat Grade A').length, 1, 'removing one packaging line keeps the other');
    const result = await submitDraft(m, ctx, P1, { ...ctx.draft, items });
    const saved = db.tables.requirement_items.filter((i) => i.requirement_id === result.requirement.id);
    assert.deepEqual(saved.map((i) => [i.product_name, i.quantity, i.weight]), [['Wheat Grade A', 40, 50], ['Wheat Grade A', 12, 25], ['Wheat Grade B', 5, 50], ['Sugar', 6, 50]]);
  });

  it('J. the repeat is a NEW order: new id, new order number, new client reference, status New, own party', async () => {
    const m = await mods();
    const db = makeDb(seed());
    const ctx = await startRepeat(m, db, P1, 'req-1');
    const r = await submitDraft(m, ctx, P1, ctx.draft);
    assert.equal(r.created, true);
    assert.notEqual(r.requirement.id, 'req-1');
    assert.notEqual(r.requirement.demand_ref, 'DR-001');
    assert.equal(r.requirement.party_id, 'party-1');
    assert.equal(r.requirement.status, 'New');
    const notes = JSON.parse(r.requirement.notes);
    assert.notEqual(notes.client_reference_id, 'ref-OLD-1');
    assert.equal(notes.client_reference_id, ctx.draft.clientReferenceId);
    assert.equal(r.requirement.assigned_to, undefined, 'the old salesperson / dispatch fields are not copied');
    assert.equal(r.orderData.id, r.requirement.id);
    assert.equal(r.orderData.updated, false);
    // two different repeats get two different references
    const again = m.rep.buildRepeatDraft({ order: ctx.order, customerProfile: P1, catalogue: CATALOGUE });
    assert.notEqual(again.clientReferenceId, ctx.draft.clientReferenceId);
  });

  it('K. original order integrity: its rows are byte-identical and no update/delete was ever issued against it', async () => {
    const m = await mods();
    const db = makeDb(seed());
    const before = snapshot(db, 'req-1');
    const ctx = await startRepeat(m, db, P1, 'req-1');
    await submitDraft(m, ctx, P1, ctx.draft);
    await submitDraft(m, ctx, P1, ctx.draft); // even a retry
    assert.equal(snapshot(db, 'req-1'), before);
    assert.deepEqual(db.log.filter((l) => l.op === 'update' || l.op === 'delete'), [], 'repeat is insert-only');
    assert.equal(db.tables.activity_logs.length, 0);
    assert.equal(snapshot(db, 'req-2'), JSON.stringify({ header: seed().requirements[1], items: seed().requirement_items.filter((i) => i.requirement_id === 'req-2') }));
  });

  it('L. duplicate prevention: rapid taps, retries and a lost response create exactly ONE order', async () => {
    const m = await mods();
    const db = makeDb(seed());
    const ctx = await startRepeat(m, db, P1, 'req-1');
    let calls = 0;
    const place = m.sub.singleFlight(async () => { calls++; return submitDraft(m, ctx, P1, ctx.draft); });
    const results = await Promise.all([place(), place(), place(), place(), place()]);
    assert.equal(calls, 1, 'five rapid taps run the submission once');
    assert.ok(results.every((r) => r === results[0]));
    // a second, separate attempt with the SAME draft reference resumes the same order
    const retry = await submitDraft(m, ctx, P1, ctx.draft);
    assert.equal(retry.alreadyPlaced, true);
    assert.equal(retry.created, false);
    assert.equal(db.tables.requirements.filter((r) => r.party_id === 'party-1').length, 2, 'original + exactly one new order');
    assert.equal(db.tables.requirement_items.filter((i) => i.requirement_id === results[0].requirement.id).length, 4, 'items are not doubled');
  });

  it('L2. a failure after the header was created is resumed, not duplicated', async () => {
    const m = await mods();
    const db = makeDb(seed());
    const ctx = await startRepeat(m, db, P1, 'req-1');
    db.faults.itemsInsert = 1;
    await assert.rejects(() => submitDraft(m, ctx, P1, ctx.draft), (e) => e.code === 'ITEMS_FAILED');
    const second = await submitDraft(m, ctx, P1, ctx.draft);
    assert.equal(second.created, false, 'the header from the first attempt is reused');
    assert.equal(db.tables.requirements.filter((r) => r.party_id === 'party-1').length, 2);
    assert.equal(db.tables.requirement_items.filter((i) => i.requirement_id === second.requirement.id).length, 4);
    db.faults.headerInsert = 1;
    const ctx2 = await startRepeat(m, db, P1, 'req-1');
    await assert.rejects(() => submitDraft(m, ctx2, P1, ctx2.draft), (e) => e.code === 'HEADER_FAILED');
  });

  it('M. draft persistence: one reference per draft, kept by the context across screens; a new session starts fresh', async () => {
    const nav = await load('src/navigation/orderNavigation.js');
    const plan = (o) => nav.planSessionInit({ mode: 'reorder', ts: 7, initializedTs: null, productsReady: true, ...o });
    assert.equal(plan({}), 'load-reorder');
    assert.equal(plan({ initializedTs: 7 }), 'keep', 'coming back from Review / another tab with the same session keeps the repeat draft');
    assert.equal(plan({ ts: 8, initializedTs: 7 }), 'load-reorder', 'tapping Repeat again (new session) rebuilds it once');
    const ctx = read('src/features/orders/OrderListContext.js');
    assert.match(ctx, /const loadRepeatDraft = \(draft\) => \{[\s\S]*setOrderItems\(draft\.items\);[\s\S]*clientReferenceId: draft\.clientReferenceId/);
    assert.match(ctx, /setExistingRequirementId\(null\);\s*\n\s*setOrderItems\(draft\.items\)/, 'a repeat never carries the old requirement id');
    const screen = read('src/features/orders/NewOrderScreen.js');
    assert.match(screen, /clientReferenceId/);
    assert.match(read('src/features/orders/OrderReviewScreen.js'), /useRef\(route\.params\.clientReferenceId \|\| newClientReferenceId\(\)\)/, 'Review keeps ONE key for its lifetime');
  });

  it('N. customer security: another customer\'s order cannot be repeated by changing the id / parameters', async () => {
    const m = await mods();
    const db = makeDb(seed());
    const c1 = db.clientFor('party-1');
    const c2 = db.clientFor('party-2');
    await assert.rejects(() => m.rep.fetchOrderForRepeat(c2, 'req-1', 'party-2'), (e) => e.code === 'NOT_FOUND');  // P2 asks for P1's order
    await assert.rejects(() => m.rep.fetchOrderForRepeat(c1, 'req-2', 'party-1'), (e) => e.code === 'NOT_FOUND');
    await assert.rejects(() => m.rep.fetchOrderForRepeat(c1, 'req-does-not-exist', 'party-1'), (e) => e.code === 'NOT_FOUND');
    await assert.rejects(() => m.rep.fetchOrderForRepeat(c1, '', 'party-1'), (e) => e.code === 'NOT_FOUND');
    // even a lying client (no server-side filter) is caught by the ownership check on the draft
    const foreign = m.norm.normalizeOrder({ ...seed().requirements[1], requirement_items: seed().requirement_items.filter((i) => i.requirement_id === 'req-2') });
    assert.throws(() => m.rep.buildRepeatDraft({ order: foreign, customerProfile: P1, catalogue: CATALOGUE }), (e) => e.code === 'NOT_OWNER');
    assert.throws(() => m.rep.buildRepeatDraft({ order: foreign, customerProfile: null, catalogue: CATALOGUE }), (e) => e.code === 'NOT_OWNER');
    // the new order can only be written under the caller's own party (RLS) — an edit of someone else's order fails too
    await assert.rejects(() => m.sub.submitOrder({ client: c2, session: session(P2), customerProfile: P1, items: [{ product_id: 'x', product_name: 'Sugar', category: 'Sugar', quantity: 1, unit: 'Bags', weight: 50 }], mode: 'create', clientReferenceId: 'ref-x', address: 'a' }), (e) => e.code === 'HEADER_FAILED');
    const order1 = m.norm.normalizeOrder({ ...seed().requirements[0], requirement_items: [] });
    await assert.rejects(() => m.sub.submitOrder({ client: c2, session: session(P2), customerProfile: P2, items: [{ product_id: 'x', product_name: 'Sugar', category: 'Sugar', quantity: 1, unit: 'Bags', weight: 50 }], mode: 'edit', existingOrder: order1, clientReferenceId: 'r', address: 'a' }), (e) => e.code === 'UPDATE_FAILED');
    assert.equal(snapshot(db, 'req-1'), snapshot(makeDb(seed()), 'req-1'));
  });

  it('O. final submission verification: the database rows match the reviewed order', async () => {
    const m = await mods();
    const db = makeDb(seed());
    const ctx = await startRepeat(m, db, P1, 'req-1');
    const r = await submitDraft(m, ctx, P1, ctx.draft);
    const header = db.tables.requirements.find((x) => x.id === r.requirement.id);
    assert.deepEqual({ party_id: header.party_id, status: header.status, unit: header.unit }, { party_id: 'party-1', status: 'New', unit: 'Bags' });
    assert.deepEqual(JSON.parse(header.notes), { address: 'Shop 4, Mandi Road, Indore', client_reference_id: ctx.draft.clientReferenceId });
    const rows = db.tables.requirement_items.filter((i) => i.requirement_id === header.id);
    assert.deepEqual(rows.map(({ product_name, category, quantity, unit, weight, gift, other_gift }) => ({ product_name, category, quantity, unit, weight, gift, other_gift })), [
      { product_name: 'Wheat Grade A', category: 'Wheat', quantity: 37, unit: 'Bags', weight: 50, gift: null, other_gift: '' },
      { product_name: 'Wheat Grade A', category: 'Wheat', quantity: 12, unit: 'Bags', weight: 25, gift: 'Others', other_gift: 'Steel Glass' },
      { product_name: 'Wheat Grade B', category: 'Wheat', quantity: 5, unit: 'Bags', weight: 50, gift: 'Bucket', other_gift: '' },
      { product_name: 'Basmati Rice', category: 'Rice', quantity: 140, unit: 'Bags', weight: 10, gift: null, other_gift: '' },
    ]);
    assert.ok(rows.every((i) => i.id !== 'it-1' && i.requirement_id !== 'req-1'));
    // it reads back through the same normalizer the order list uses, and shows the repeated quantities
    const back = await m.rep.fetchOrderForRepeat(ctx.client, header.id, 'party-1');
    assert.equal(back.totalQuantity, 37 + 12 + 5 + 140);
    assert.deepEqual(m.sub.toOrderData(r.requirement, 'reorder'), { id: header.id, order_no: header.demand_ref, final_amount: 0, status: 'New', updated: false });
  });

  it('guards: empty / invalid drafts and a missing profile are refused before anything is written', async () => {
    const m = await mods();
    const db = makeDb(seed());
    const client = db.clientFor('party-1');
    const base = { client, session: session(P1), customerProfile: P1, mode: 'reorder', clientReferenceId: 'r', address: 'a' };
    await assert.rejects(() => m.sub.submitOrder({ ...base, items: [] }), (e) => e.code === 'EMPTY');
    await assert.rejects(() => m.sub.submitOrder({ ...base, customerProfile: null, items: [{}] }), (e) => e.code === 'PROFILE_MISSING');
    await assert.rejects(() => m.sub.submitOrder({ ...base, items: [{ product_id: 'p', product_name: 'Sugar', category: 'Sugar', quantity: 0, weight: 50 }] }), (e) => e.code === 'INVALID_ITEMS');
    await assert.rejects(() => m.sub.submitOrder({ ...base, items: [{ product_id: 'p', product_name: 'Sugar', category: 'Sugar', quantity: 2, weight: -5 }] }), (e) => e.code === 'INVALID_ITEMS');
    assert.equal(db.log.length, 0);
    assert.throws(() => m.rep.buildRepeatDraft({ order: { ...seed(), party_id: 'party-1', items: [] }, customerProfile: P1, catalogue: CATALOGUE }), (e) => e.code === 'NOT_OWNER' || e.code === 'NO_ITEMS');
    assert.throws(() => m.rep.buildRepeatDraft({ order: { party_id: 'party-1', items: [] }, customerProfile: P1, catalogue: CATALOGUE }), (e) => e.code === 'NO_ITEMS');
  });

  it('the required confirmation message is exact (English and Hindi) and shown by the screen', async () => {
    const m = await mods();
    assert.equal(m.rep.REPEAT_MESSAGE.en, 'Your previous order details have been filled in. Please review the products, quantities, delivery details and current prices before submitting.');
    assert.match(read('src/features/orders/NewOrderScreen.js'), /\{isHindi \? REPEAT_MESSAGE\.hi : REPEAT_MESSAGE\.en\}/);
  });

  it('wiring: Repeat buttons go through the shared start action and only OrderReview submits (no auto-submit)', () => {
    const screen = read('src/features/orders/NewOrderScreen.js');
    assert.match(screen, /navigation\.navigate\('OrderReview'/);
    assert.doesNotMatch(screen, /submitOrder\(/, 'the New Order form never submits by itself');
    assert.doesNotMatch(read('src/features/orders/OrderListContext.js'), /supabase/, 'the cart context never talks to the database');
    const review = read('src/features/orders/OrderReviewScreen.js');
    assert.match(review, /submitOrder\(\{/);
    assert.match(review, /singleFlight\(/);
    assert.match(review, /disabled=\{loading \|\| problems\.length > 0\}/);
  });
});
