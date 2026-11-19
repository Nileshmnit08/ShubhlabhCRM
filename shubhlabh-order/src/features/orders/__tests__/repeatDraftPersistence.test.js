// SL-ORDER-REPEAT-ORDER-03 — Repeat Order draft persistence, restoration after a simulated app restart,
// duplicate-submission safety across a restart, and the Order Success exit wiring.
// Real modules (repeatOrder / orderSubmission / orderDraftStorage / orderNavigation) + an in-memory AsyncStorage
// stand-in whose contents outlive each simulated "app instance". Synthetic data only.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '../../../..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const makeStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, async getItem(k) { return k in data ? data[k] : null; }, async setItem(k, v) { data[k] = String(v); }, async removeItem(k) { delete data[k]; } };
};
const failingStorage = { async getItem() { throw new Error('disk'); }, async setItem() { throw new Error('disk'); }, async removeItem() { throw new Error('disk'); } };

const CATALOGUE = [
  { id: 'p-a', name: 'Wheat Grade A', category: 'Wheat', active: true },
  { id: 'p-b', name: 'Wheat Grade B', category: 'Wheat', active: true },
  { id: 'p-rice', name: 'Basmati Rice', category: 'Rice', active: true },
];
const P1 = { id: 'party-1', city: 'Indore' };
const ORDER = {
  id: 'req-1', party_id: 'party-1', order_no: 'DR-001', status: 'DISPATCHED', delivery_address: 'Shop 4, Mandi Road, Indore',
  items: [
    { id: 'it-1', product_name: 'Wheat Grade A', category: 'Wheat', quantity: 37, unit: 'Bags', weight: 50, gift: null, other_gift: null },
    { id: 'it-2', product_name: 'Wheat Grade A', category: 'Wheat', quantity: 12, unit: 'Bags', weight: 25, gift: 'Others', other_gift: 'Steel Glass' },
    { id: 'it-3', product_name: 'Basmati Rice', category: 'Rice', quantity: 140, unit: 'Bags', weight: 10, gift: 'Bucket', other_gift: null },
  ],
};

async function mods() {
  const [rep, store, nav, sub] = await Promise.all([
    load('src/features/orders/repeatOrder.js'), load('src/features/orders/orderDraftStorage.js'),
    load('src/navigation/orderNavigation.js'), load('src/features/orders/orderSubmission.js'),
  ]);
  return { rep, store, nav, sub };
}
const metaOf = (draft) => ({ kind: 'repeat', clientReferenceId: draft.clientReferenceId, deliveryAddress: draft.deliveryAddress, source: draft.source, unavailableCount: draft.unavailableCount, priceChangeCount: draft.priceChangeCount });
const build = (m) => m.rep.buildRepeatDraft({ order: ORDER, customerProfile: P1, catalogue: CATALOGUE });

// What the app does on start: restore into an EMPTY cart only (the provider's rule), else leave as is.
async function simulateAppStart(m, storage, partyId, currentCart = []) {
  const res = await m.store.loadDraft(storage, partyId);
  if (res.ok && currentCart.length === 0) return { items: res.items, meta: res.meta, restored: true, res };
  return { items: currentCart, meta: null, restored: false, res };
}

describe('Repeat draft persistence (simulated app restart)', () => {
  it('saves and restores the exact lines, client reference, gifts, packaging and delivery address', async () => {
    const m = await mods();
    const storage = makeStorage();
    const draft = build(m);
    assert.equal(await m.store.saveDraft(storage, { partyId: 'party-1', items: draft.items, meta: metaOf(draft) }), true);
    // --- app killed; a new process reads the same storage ---
    const after = await simulateAppStart(m, storage, 'party-1');
    assert.equal(after.restored, true);
    assert.deepEqual(after.items, draft.items, 'every line is identical (ids included, so no line is duplicated or re-created)');
    assert.deepEqual(after.items.map((i) => [i.product_name, i.quantity, i.weight, i.gift, i.other_gift]), [
      ['Wheat Grade A', 37, 50, null, ''], ['Wheat Grade A', 12, 25, 'Others', 'Steel Glass'], ['Basmati Rice', 140, 10, 'Bucket', ''],
    ]);
    assert.equal(after.meta.clientReferenceId, draft.clientReferenceId, 'the SAME client_reference_id survives the restart');
    assert.equal(after.meta.deliveryAddress, 'Shop 4, Mandi Road, Indore');
    assert.deepEqual(after.meta.source, { id: 'req-1', order_no: 'DR-001' });
    assert.equal(after.meta.kind, 'repeat');
  });

  it('edits made before the restart (quantity, removed line) are what comes back', async () => {
    const m = await mods();
    const storage = makeStorage();
    const draft = build(m);
    let items = draft.items.map((i) => ({ ...i }));
    items[0].quantity = 40;
    items = m.rep.removeLineAt(items, 2);
    await m.store.saveDraft(storage, { partyId: 'party-1', items, meta: metaOf(draft) });
    const after = await simulateAppStart(m, storage, 'party-1');
    assert.deepEqual(after.items.map((i) => [i.product_name, i.quantity, i.weight]), [['Wheat Grade A', 40, 50], ['Wheat Grade A', 12, 25]]);
  });

  it('restoration is once and never duplicates: restoring twice into the same cart yields the same single draft', async () => {
    const m = await mods();
    const storage = makeStorage();
    const draft = build(m);
    await m.store.saveDraft(storage, { partyId: 'party-1', items: draft.items, meta: metaOf(draft) });
    const first = await simulateAppStart(m, storage, 'party-1');
    const second = await simulateAppStart(m, storage, 'party-1', first.items); // cart already holds it
    assert.equal(second.restored, false, 'a non-empty cart is never overwritten or appended to');
    assert.equal(second.items.length, 3);
    assert.equal(Object.keys(storage.data).length, 1, 'one slot per customer');
  });

  it('an unrelated active draft is not overwritten by a stored one', async () => {
    const m = await mods();
    const storage = makeStorage();
    const draft = build(m);
    await m.store.saveDraft(storage, { partyId: 'party-1', items: draft.items, meta: metaOf(draft) });
    const active = [{ id: 'x1', product_id: 'p-b', product_name: 'Wheat Grade B', category: 'Wheat', quantity: 2 }];
    const after = await simulateAppStart(m, storage, 'party-1', active);
    assert.equal(after.restored, false);
    assert.deepEqual(after.items, active);
    assert.ok(storage.data[m.store.draftKey('party-1')], 'the stored draft is kept, not deleted');
  });

  it('another customer on the same device never sees the draft; the owner still does', async () => {
    const m = await mods();
    const storage = makeStorage();
    const draft = build(m);
    await m.store.saveDraft(storage, { partyId: 'party-1', items: draft.items, meta: metaOf(draft) });
    assert.equal((await simulateAppStart(m, storage, 'party-2')).restored, false);
    assert.equal((await simulateAppStart(m, storage, 'party-1')).restored, true, 'logout / other login does not delete it');
    // a slot copied under the wrong key is rejected by its embedded party id
    const key1 = m.store.draftKey('party-1');
    const stolen = makeStorage({ [m.store.draftKey('party-2')]: storage.data[key1] });
    assert.deepEqual((await m.store.loadDraft(stolen, 'party-2')).reason, 'other-customer');
  });

  it('only repeat drafts are stored: a normal cart or an edit session is not', async () => {
    const m = await mods();
    const storage = makeStorage();
    const items = build(m).items;
    assert.equal(await m.store.saveDraft(storage, { partyId: 'party-1', items, meta: { kind: 'create', clientReferenceId: 'r' } }), false);
    assert.equal(await m.store.saveDraft(storage, { partyId: 'party-1', items, meta: { kind: 'edit', clientReferenceId: 'r' } }), false);
    assert.equal(await m.store.saveDraft(storage, { partyId: 'party-1', items: [], meta: { kind: 'repeat', clientReferenceId: 'r' } }), false);
    assert.equal(await m.store.saveDraft(storage, { partyId: null, items, meta: { kind: 'repeat', clientReferenceId: 'r' } }), false);
    assert.equal(Object.keys(storage.data).length, 0);
  });

  it('cleared after a successful submission and after an explicit replacement; kept otherwise', async () => {
    const m = await mods();
    const storage = makeStorage();
    const draft = build(m);
    const key = m.store.draftKey('party-1');
    await m.store.saveDraft(storage, { partyId: 'party-1', items: draft.items, meta: metaOf(draft) });
    // simply leaving the screen / backgrounding the app changes nothing
    assert.ok(storage.data[key]);
    // success → discardSavedDraft
    await m.store.clearDraft(storage, 'party-1');
    assert.equal(storage.data[key], undefined);
    assert.equal((await simulateAppStart(m, storage, 'party-1')).restored, false, 'a submitted order never comes back after a restart');
    await m.store.clearDraft(storage, 'party-1'); // clearing twice is harmless
  });

  it('damaged / old / expired / partial data is refused and removed — never half-restored', async () => {
    const m = await mods();
    const draft = build(m);
    const good = JSON.parse(m.store.serializeDraft({ partyId: 'party-1', items: draft.items, meta: metaOf(draft) }));
    const key = m.store.draftKey('party-1');
    const cases = {
      'not JSON': ['{oops', 'corrupt'],
      'wrong version': [JSON.stringify({ ...good, version: 99 }), 'version'],
      'expired': [JSON.stringify({ ...good, savedAt: Date.now() - m.store.DRAFT_MAX_AGE_MS - 1000 }), 'expired'],
      'a malformed line': [JSON.stringify({ ...good, items: [good.items[0], { quantity: 3 }] }), 'corrupt'],
      'no items': [JSON.stringify({ ...good, items: [] }), 'corrupt'],
      'no reference': [JSON.stringify({ ...good, meta: { ...good.meta, clientReferenceId: '' } }), 'corrupt'],
    };
    for (const [label, [raw, reason]] of Object.entries(cases)) {
      const storage = makeStorage({ [key]: raw });
      const res = await m.store.loadDraft(storage, 'party-1');
      assert.deepEqual([res.ok, res.reason], [false, reason], label);
      assert.equal(storage.data[key], undefined, `${label}: the unusable draft is deleted`);
    }
    assert.deepEqual((await m.store.loadDraft(failingStorage, 'party-1')).ok, false, 'storage failure never crashes the app');
    assert.equal(await m.store.saveDraft(failingStorage, { partyId: 'party-1', items: draft.items, meta: metaOf(draft) }), false);
  });

  it('after a restart the lines are re-checked against the CURRENT catalogue: removed product warned, nothing substituted, quantities kept', async () => {
    const m = await mods();
    const storage = makeStorage();
    const draft = build(m);
    await m.store.saveDraft(storage, { partyId: 'party-1', items: draft.items, meta: metaOf(draft) });
    const { items } = await simulateAppStart(m, storage, 'party-1');
    const newer = [{ id: 'p-a-NEW', name: 'Wheat Grade A', category: 'Wheat', active: true }, ...CATALOGUE.filter((p) => p.name !== 'Basmati Rice' && p.id !== 'p-a')];
    const checked = m.store.revalidateDraftItems(items, newer);
    assert.equal(checked[2].product_id, null);
    assert.equal(checked[2].product_name, 'Basmati Rice', 'never replaced by another product');
    assert.equal(checked[2].quantity, 140);
    assert.equal(checked[0].product_id, 'p-a-NEW', 'a surviving product is re-linked to its live record');
    assert.equal(m.rep.canSubmitDraft(checked), false, 'submission stays blocked until the customer resolves it');
    assert.equal(m.rep.validateDraftItems(checked).map((x) => x.index).join(), '2');
    assert.deepEqual(checked.map((i) => [i.quantity, i.weight, i.gift, i.other_gift]), items.map((i) => [i.quantity, i.weight, i.gift, i.other_gift]));
    assert.equal(m.store.revalidateDraftItems(items, []), items, 'an unavailable catalogue changes nothing');
  });

  it('a restart in the middle of submission cannot create a second order (same client reference resumes the first)', async () => {
    const m = await mods();
    const storage = makeStorage();
    const draft = build(m);
    await m.store.saveDraft(storage, { partyId: 'party-1', items: draft.items, meta: metaOf(draft) });
    // tiny server: header insert succeeds, then the app dies before the success handler could clear the draft
    const headers = []; const itemRows = [];
    const client = {
      from(table) {
        const q = { table, payload: null, op: 'select' };
        const api = {
          select() { return api; }, order() { return api; }, limit() { return api; }, eq() { return api; },
          insert(p) { q.op = 'insert'; q.payload = p; return api; }, single() { q.single = true; return api; },
          then(res, rej) {
            let out;
            if (table === 'requirements' && q.op === 'select') out = { data: headers.map((h) => ({ ...h, requirement_items: itemRows.filter((i) => i.requirement_id === h.id) })), error: null };
            else if (table === 'requirements') { const row = { ...q.payload, id: `req-${headers.length + 10}`, demand_ref: 'DR-X', created_at: 1 }; headers.push(row); out = { data: row, error: null }; }
            else { (Array.isArray(q.payload) ? q.payload : [q.payload]).forEach((r) => itemRows.push(r)); out = { data: null, error: null }; }
            return Promise.resolve(out).then(res, rej);
          },
        };
        return api;
      },
    };
    const run = (d) => m.sub.submitOrder({ client, session: { user: { id: 'u' } }, customerProfile: P1, items: d.items, mode: 'reorder', clientReferenceId: d.meta ? d.meta.clientReferenceId : d.clientReferenceId, address: 'Shop 4' });
    await run(draft);                                            // first process: order created, then killed
    const restored = await simulateAppStart(m, storage, 'party-1'); // second process restores the draft
    const second = await run({ items: restored.items, meta: restored.meta });
    assert.equal(second.alreadyPlaced, true);
    assert.equal(second.created, false);
    assert.equal(headers.length, 1, 'exactly one order exists');
    assert.equal(itemRows.length, 3, 'items were not inserted twice');
  });
});

describe('Catalogue shapes seen in production (synthetic rows: same name in two categories, inactive products, case)', () => {
  it('maps by exact name + category, never by name alone, never fuzzily, never to an inactive product', async () => {
    const m = await mods();
    const catalogue = [
      { id: 'c-churi', name: 'Makka Daliya', category: 'Churi', active: true },
      { id: 'c-daliya', name: 'Makka Daliya', category: 'Daliya', active: true },
      { id: 'c-feed', name: 'Pallet Naman', category: 'Feed', active: true },
      { id: 'c-old', name: 'Broiler Starter', category: 'Broiler', active: false },
    ];
    const line = (id, product_name, category, quantity, weight) => ({ id, product_name, category, quantity, unit: 'Bags', weight, gift: null, other_gift: null });
    const order = { id: 'R', party_id: 'party-1', order_no: 'X', delivery_address: '', items: [
      line('1', 'Makka Daliya', 'Churi', 21, 25), line('2', 'Makka Daliya', 'Daliya', 22, 30),
      line('3', 'Pallet Naman', 'Pallet', 4, 50), line('4', 'pallet naman', 'Feed', 5, 50), line('5', 'Broiler Starter', 'Broiler', 6, 50),
    ] };
    const d = m.rep.buildRepeatDraft({ order, customerProfile: P1, catalogue });
    assert.deepEqual(d.items.map((i) => i.product_id), ['c-churi', 'c-daliya', null, null, null]);
    assert.deepEqual(d.items.map((i) => [i.quantity, i.weight]), [[21, 25], [22, 30], [4, 50], [5, 50], [6, 50]], 'exact quantity and non-standard packaging kept even for unavailable lines');
    assert.deepEqual(d.items.map((i) => i.product_name), ['Makka Daliya', 'Makka Daliya', 'Pallet Naman', 'pallet naman', 'Broiler Starter'], 'names are never rewritten');
    assert.equal(d.unavailableCount, 3);
    assert.equal(m.rep.canSubmitDraft(d.items), false);
  });
});

describe('Resuming a restored draft through the shared order-start action', () => {
  const mkNav = (rootRoutes) => {
    const calls = [];
    return { calls, navigate: (...a) => calls.push(a), getRootState: () => ({ routes: rootRoutes }) };
  };
  const guard = (m) => { let t = 1e9; return { guard: m.nav.createTapGuard({ windowMs: 800, now: () => (t += 1000) }) }; };

  it('with a saved draft and no open flow (after restart) the customer is asked; Continue re-opens it WITHOUT resetting', async () => {
    const m = await mods();
    const nav = mkNav([{ name: 'MainTabs' }]);
    let asked = 0;
    const out = await m.nav.requestOrderStart(nav, { kind: 'new' }, { hasDraft: true, hasSavedDraft: true, askDraft: async () => { asked++; return 'continue'; }, ...guard(m) });
    assert.equal(out, 'resumed');
    assert.equal(asked, 1);
    const [name, params] = nav.calls[0];
    assert.equal(name, 'NewOrderTab');
    assert.equal(params.params.mode, 'resume');
    assert.equal(m.nav.planSessionInit({ mode: 'resume', ts: params.params.ts, initializedTs: null, productsReady: false }), 'mark', 'the cart is neither cleared nor reloaded');
    assert.equal('previousOrder' in params.params, false);
  });

  it('Start new replaces it on purpose; Cancel changes nothing; a plain abandoned cart (not saved) is not asked about', async () => {
    const m = await mods();
    let nav = mkNav([{ name: 'MainTabs' }]);
    assert.equal(await m.nav.requestOrderStart(nav, { kind: 'new' }, { hasDraft: true, hasSavedDraft: true, askDraft: async () => 'new', ...guard(m) }), 'started');
    assert.equal(nav.calls[0][1].params.mode, 'create');
    nav = mkNav([{ name: 'MainTabs' }]);
    assert.equal(await m.nav.requestOrderStart(nav, { kind: 'new' }, { hasDraft: true, hasSavedDraft: true, askDraft: async () => 'cancel', ...guard(m) }), 'cancelled');
    assert.equal(nav.calls.length, 0);
    nav = mkNav([{ name: 'MainTabs' }]);
    assert.equal(await m.nav.requestOrderStart(nav, { kind: 'new' }, { hasDraft: true, hasSavedDraft: false, askDraft: async () => { throw new Error('must not ask'); }, ...guard(m) }), 'started');
  });

  it('tapping Repeat Order for the same order while a saved draft exists asks first (no duplicate draft)', async () => {
    const m = await mods();
    const nav = mkNav([{ name: 'MainTabs' }]);
    let asked = 0;
    await m.nav.requestOrderStart(nav, { kind: 'reorder', order: { id: 'req-1' } }, { hasDraft: true, hasSavedDraft: true, askDraft: async () => { asked++; return 'continue'; }, ...guard(m) });
    assert.equal(asked, 1);
    assert.equal(nav.calls[0][1].params.mode, 'resume');
  });
});

describe('Order Success navigation wiring', () => {
  it('every exit from Order Success pops to the original MainTabs', async () => {
    const m = await mods();
    for (const [exit, id, screen] of [['orders', null, 'OrdersTab'], ['home', null, 'HomeTab'], ['detail', 'o-1', 'OrdersTab']]) {
      const nav = m.nav.buildSuccessExit(exit, id);
      assert.equal(nav.name, 'MainTabs');
      assert.equal(nav.options.pop, true);
      assert.equal(nav.params.pop, true);
      assert.equal(nav.params.screen, screen);
    }
    assert.equal(m.nav.buildSuccessExit('detail', null).params.params.screen, 'MyOrders', 'a detail exit without an id falls back to My Orders');
    assert.equal(m.nav.leaveOrderSuccess(null), false);
  });

  it('Order Success has no plain navigate to MainTabs left; it handles hardware Back and disables the swipe gesture', () => {
    const src = read('src/features/orders/OrderSuccessScreen.js');
    assert.doesNotMatch(src, /navigation\.navigate\(/);
    assert.match(src, /BackHandler\.addEventListener\('hardwareBackPress'/);
    assert.match(src, /return true;/);
    assert.match(src, /leaveOrderSuccess\(navigation, SUCCESS_EXITS\.ORDERS\)/);
    assert.match(src, /leaveOrderSuccess\(navigation, SUCCESS_EXITS\.DETAIL, orderData\?\.id\)/);
    assert.match(src, /leaveOrderSuccess\(navigation, SUCCESS_EXITS\.HOME\)/);
    assert.match(read('src/navigation/NewOrderStackNavigator.js'), /name="OrderSuccess" component=\{OrderSuccessScreen\} options=\{\{ gestureEnabled: false \}\}/);
  });

  it('persistence is wired: provider restores into an empty cart, saves repeat drafts only, Review clears it on success', () => {
    const ctx = read('src/features/orders/OrderListContext.js');
    assert.match(ctx, /loadDraft\(AsyncStorage, partyId\)/);
    assert.match(ctx, /draftCountRef\.current === 0/);
    assert.match(ctx, /draftMeta\.kind !== 'repeat'\) return;/);
    assert.match(ctx, /const startNewOrder = \(\) => \{\s*discardSavedDraft\(\);/);
    assert.doesNotMatch(ctx, /clearDraft\([^)]*\);\s*\n\s*clearOrderList/);
    const review = read('src/features/orders/OrderReviewScreen.js');
    assert.ok(review.indexOf('latest.current.discardSavedDraft()') < review.indexOf("navigation.navigate('OrderSuccess'"), 'the saved draft is removed before leaving Review');
    assert.match(read('src/features/orders/NewOrderScreen.js'), /draftMeta\?\.restored && allProducts\.length > 0/);
    assert.match(read('src/navigation/useOrderNavigation.js'), /hasSavedDraft: hasSavedDraft\(\)/);
  });
});
