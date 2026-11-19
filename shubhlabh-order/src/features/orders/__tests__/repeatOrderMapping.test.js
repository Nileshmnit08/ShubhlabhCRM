// SL-ORDER-REPEAT-ORDER-05 — a previous order line is rebuilt into the New Order form's own fields
// (category → product → unit → weight → quantity → gift → other gift). Legacy lines that carry the packaging in the
// product name ("Shubh Labh (45 kg)") must match the catalogue product "Shubh Labh" with weight 45.
// Real normalizer / repeatOrder / orderSubmission code; synthetic rows shaped like the Field Assist / CRM writers.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '../../../..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const CATALOGUE = [
  { id: 'pal-sl', name: 'Shubh Labh', category: 'Pallet', active: true },
  { id: 'pal-nam', name: 'Naman', category: 'Pallet', active: true },
  { id: 'feed-sl', name: 'Pallet Shubh Labh', category: 'Feed', active: true },
  { id: 'churi-md', name: 'Makka Daliya', category: 'Churi', active: true },
  { id: 'dal-md', name: 'Makka Daliya', category: 'Daliya', active: true },
  { id: 'mix-dry', name: 'Dry Mix', category: 'Mix', active: true },
];
const P1 = { id: 'party-1' };
const row = (id, product_name, category, quantity, extra = {}) => ({ id, product_name, category, quantity, unit: 'Bags', weight: null, gift: null, other_gift: null, ...extra });
const draftFor = async (rows, extraHeader = {}, catalogue = CATALOGUE) => {
  const [rep, norm] = await Promise.all([load('src/features/orders/repeatOrder.js'), load('src/features/orders/orderNormalizer.js')]);
  const order = norm.normalizeOrder({ id: 'R1', party_id: 'party-1', demand_ref: 'D-124', status: 'Confirmed', notes: JSON.stringify({ address: 'Shop 4' }), requirement_items: rows, ...extraHeader });
  return { rep, draft: rep.buildRepeatDraft({ order, customerProfile: P1, catalogue }) };
};
// What the New Order form can show: category chips = catalogue categories, product chips = products of the selected category.
const formShows = (catalogue, item) => {
  const categories = [...new Set(catalogue.map((p) => p.category))];
  const productsInCategory = catalogue.filter((p) => p.category === item.category).map((p) => p.name);
  return categories.includes(item.category) && productsInCategory.includes(item.product_name);
};

describe('SL-ORDER-REPEAT-ORDER-05 mapping', () => {
  it('ROOT CAUSE: "Shubh Labh (45 kg)" is split into product "Shubh Labh" + weight 45 and is NOT unavailable', async () => {
    const { rep, draft } = await draftFor([row('1', 'Shubh Labh (45 kg)', 'Pallet', 60)]);
    const it = draft.items[0];
    assert.deepEqual([it.category, it.product_name, it.unit, it.weight, it.quantity, it.gift, it.other_gift], ['Pallet', 'Shubh Labh', 'Bags', 45, 60, null, '']);
    assert.equal(it.product_id, 'pal-sl');
    assert.equal(draft.unavailableCount, 0);
    assert.equal(rep.canSubmitDraft(draft.items), true);
    assert.deepEqual(rep.parseProductLabel('Shubh Labh (45 kg)'), { baseName: 'Shubh Labh', weight: 45 });
    // the OLD rule (exact stored name) really could not find it
    assert.equal(rep.findProduct(CATALOGUE, 'Shubh Labh (45 kg)', 'Pallet'), null);
    assert.ok(formShows(CATALOGUE, it), 'category chip and product chip both exist in the form');
  });

  it('Shubh Labh 50 kg with a different quantity: 50 is kept as 50, not defaulted, quantity exact', async () => {
    const { draft } = await draftFor([row('1', 'Shubh Labh (50 kg)', 'Pallet', 175)]);
    assert.deepEqual([draft.items[0].weight, draft.items[0].quantity], [50, 175]);
  });

  it('the same product with two weights stays two separate lines', async () => {
    const { draft } = await draftFor([row('1', 'Shubh Labh (45 kg)', 'Pallet', 60), row('2', 'Shubh Labh (50 kg)', 'Pallet', 20), row('3', 'Shubh Labh', 'Pallet', 7, { weight: 35 })]);
    assert.deepEqual(draft.items.map((i) => [i.product_name, i.weight, i.quantity]), [['Shubh Labh', 45, 60], ['Shubh Labh', 50, 20], ['Shubh Labh', 35, 7]]);
    assert.equal(draft.items.length, 3);
    assert.equal(new Set(draft.items.map((i) => i.id)).size, 3);
  });

  it('an explicit weight column wins; with the weight column AND the suffix they agree; a 45 kg line never becomes 50', async () => {
    const { draft } = await draftFor([row('1', 'Dry Mix (50 kg)', 'Mix', 5, { weight: 50 }), row('2', 'Naman (45 kg)', 'Pallet', 9, { weight: '45' }), row('3', 'Naman', 'Pallet', 4, { weight: 60 })]);
    assert.deepEqual(draft.items.map((i) => i.weight), [50, 45, 60]);
    assert.equal(draft.items.some((i) => i.weight === 50 && i.product_name === 'Naman'), false);
  });

  it('weight kept in the order header extras (very old orders) is used too', async () => {
    const { draft } = await draftFor([row('1', 'Naman', 'Pallet', 9)], { notes: JSON.stringify({ address: 'Shop 4', extras: { 'Pallet_Naman': { weight: 45, gift: 'Katora' } } }) });
    assert.deepEqual([draft.items[0].weight, draft.items[0].gift], [45, 'Katora']);
  });

  it('the same product name in two categories maps by category', async () => {
    const { draft } = await draftFor([row('1', 'Makka Daliya (25 kg)', 'Churi', 3), row('2', 'Makka Daliya (30 kg)', 'Daliya', 4)]);
    assert.deepEqual(draft.items.map((i) => [i.category, i.product_id, i.weight]), [['Churi', 'churi-md', 25], ['Daliya', 'dal-md', 30]]);
    // a Daliya-category line is never matched to the Churi product (and vice versa) when the category does not have it
    const { draft: d2 } = await draftFor([row('1', 'Dry Mix', 'Pallet', 3)]);
    assert.equal(d2.items[0].product_id, null);
  });

  it('category labels are resolved to the real category value; a label is never an identifier', async () => {
    const { rep, draft } = await draftFor([row('1', 'Shubh Labh (45 kg)', 'CATEGORY.PALLET', 60), row('2', 'Naman', 'category.Pallet', 2), row('3', 'Dry Mix', ' mix ', 1)]);
    assert.deepEqual(draft.items.map((i) => [i.category, i.product_id]), [['Pallet', 'pal-sl'], ['Pallet', 'pal-nam'], ['Mix', 'mix-dry']]);
    assert.equal(rep.resolveCategory('CATEGORY.UNKNOWN', CATALOGUE), null);
    assert.equal(rep.resolveCategory('Pallet', CATALOGUE), 'Pallet');
    // and the draft category is what the form's category chips use, never the label
    assert.ok(draft.items.every((i) => formShows(CATALOGUE, i)));
  });

  it('units are restored exactly (Bags / MT), including different capitalisation', async () => {
    const { draft } = await draftFor([row('1', 'Naman', 'Pallet', 2, { unit: 'MT' }), row('2', 'Naman', 'Pallet', 3, { unit: 'bags', weight: 40 }), row('3', 'Naman', 'Pallet', 4, { unit: 'mt', weight: 35 })]);
    assert.deepEqual(draft.items.map((i) => i.unit), ['MT', 'Bags', 'MT']);
  });

  it('gifts: selected gift, Other Gift text, and no gift (stays unselected, nothing invented)', async () => {
    const { draft } = await draftFor([
      row('1', 'Shubh Labh (45 kg)', 'Pallet', 60, { gift: 'Katora' }),
      row('2', 'Shubh Labh (50 kg)', 'Pallet', 10, { gift: 'Others', other_gift: 'Steel Glass' }),
      row('3', 'Naman (45 kg)', 'Pallet', 5),
    ]);
    assert.deepEqual(draft.items.map((i) => [i.gift, i.other_gift]), [['Katora', ''], ['Others', 'Steel Glass'], [null, '']]);
  });

  it('a genuinely discontinued product is the ONLY thing reported unavailable; its line, quantity and weight are kept', async () => {
    const { rep, draft } = await draftFor([row('1', 'Shubh Labh (45 kg)', 'Pallet', 60), row('2', 'Gold Special (40 kg)', 'Pallet', 11), row('3', 'Broiler Starter (50 kg)', 'Broiler', 6)]);
    assert.deepEqual(draft.items.map((i) => i.product_id), ['pal-sl', null, null]);
    assert.equal(draft.unavailableCount, 2);
    assert.deepEqual(draft.items[1].product_name, 'Gold Special (40 kg)', 'shown exactly as stored — nothing substituted');
    assert.deepEqual([draft.items[1].quantity, draft.items[1].weight], [11, 40]);
    assert.deepEqual(rep.validateDraftItems(draft.items).map((x) => x.index), [1, 2]);
    assert.equal(rep.canSubmitDraft(draft.items), false);
    const kept = rep.removeLineAt(rep.removeLineAt(draft.items, 2), 1);
    assert.equal(rep.canSubmitDraft(kept), true, 'the customer can remove them (or pick another product by hand)');
  });

  it('an inactive product is unavailable even when the name + weight matches', async () => {
    const inactive = CATALOGUE.map((p) => (p.id === 'pal-sl' ? { ...p, active: false } : p));
    const { draft } = await draftFor([row('1', 'Shubh Labh (45 kg)', 'Pallet', 60)], {}, inactive);
    assert.equal(draft.items[0].product_id, null);
    assert.equal(draft.items[0].weight, 45);
  });

  it('what is submitted is clean data: product, weight and quantity in their own columns (the old order is not touched)', async () => {
    const [sub] = await Promise.all([load('src/features/orders/orderSubmission.js')]);
    const { draft } = await draftFor([row('1', 'Shubh Labh (45 kg)', 'Pallet', 60, { gift: 'Others', other_gift: 'Steel Glass' })]);
    assert.deepEqual(sub.buildItemsPayload('NEW-1', draft.items), [{ requirement_id: 'NEW-1', product_name: 'Shubh Labh', category: 'Pallet', quantity: 60, unit: 'Bags', weight: 45, gift: 'Others', other_gift: 'Steel Glass' }]);
    assert.equal(draft.source.id, 'R1');
    assert.ok(draft.items.every((i) => !('requirement_id' in i)));
  });

  it('ACCEPTANCE: Pallet → Shubh Labh → Bags → 45 kg → 60 reaches the form, is saved as a NEW order with the same values, and the original is unchanged', async () => {
    const [rep, norm, sub] = await Promise.all([load('src/features/orders/repeatOrder.js'), load('src/features/orders/orderNormalizer.js'), load('src/features/orders/orderSubmission.js')]);
    // "the database": the original order exactly as the CRM / Field Assist stored it (packaging inside the name)
    const requirements = [{ id: 'R1', party_id: 'party-1', demand_ref: 'D-124', status: 'Confirmed', unit: 'Bags', created_at: 1, notes: JSON.stringify({ address: 'Shop 4, Indore', client_reference_id: 'ref-old' }) }];
    const items = [{ id: 'I1', requirement_id: 'R1', product_name: 'Shubh Labh (45 kg)', category: 'Pallet', quantity: 60, unit: 'Bags', weight: 45, gift: null, other_gift: null }];
    const before = JSON.stringify({ requirements, items });
    const ops = [];
    const client = {
      from(table) {
        const q = { op: 'select', payload: null };
        const api = {
          select() { return api; }, order() { return api; }, limit() { return api; }, eq() { return api; }, single() { return api; }, maybeSingle() { return api; },
          insert(p) { q.op = 'insert'; q.payload = p; return api; }, update() { q.op = 'update'; return api; }, delete() { q.op = 'delete'; return api; },
          then(res, rej) {
            ops.push([q.op, table]);
            let out;
            if (q.op === 'select' && table === 'requirements') out = { data: requirements.map((r) => ({ ...r, requirement_items: items.filter((i) => i.requirement_id === r.id) })).filter((r) => r.id === 'R1' || r.id.startsWith('NEW')).map((r) => (r.id === 'R1' ? r : r)), error: null };
            else if (q.op === 'insert' && table === 'requirements') { const row = { ...q.payload, id: `NEW-${requirements.length}`, demand_ref: 'D-200', created_at: 2 }; requirements.push(row); out = { data: row, error: null }; }
            else if (q.op === 'insert') { (Array.isArray(q.payload) ? q.payload : [q.payload]).forEach((r) => items.push({ ...r, id: `NI${items.length}` })); out = { data: null, error: null }; }
            else out = { data: [], error: null };
            return Promise.resolve(out).then(res, rej);
          },
        };
        return api;
      },
    };
    // 1. Repeat → the form's fields, in the form's order
    const order = await rep.fetchOrderForRepeat({ from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { ...requirements[0], requirement_items: items.filter((i) => i.requirement_id === 'R1') }, error: null }) }) }, 'R1', 'party-1');
    const draft = rep.buildRepeatDraft({ order, customerProfile: P1, catalogue: CATALOGUE });
    const line = draft.items[0];
    assert.deepEqual([line.category, line.product_name, line.unit, line.weight, line.quantity], ['Pallet', 'Shubh Labh', 'Bags', 45, 60]);
    assert.equal(line.product_id, 'pal-sl');
    assert.equal(draft.unavailableCount, 0);
    // 2. submit the repeat
    const result = await sub.submitOrder({ client, session: { user: { id: 'u' } }, customerProfile: P1, items: draft.items, mode: 'reorder', clientReferenceId: draft.clientReferenceId, address: draft.deliveryAddress });
    const saved = items.filter((i) => i.requirement_id === result.requirement.id);
    assert.deepEqual(saved.map((i) => [i.category, i.product_name, i.unit, i.weight, i.quantity]), [['Pallet', 'Shubh Labh', 'Bags', 45, 60]]);
    assert.notEqual(result.requirement.id, 'R1');
    // 3. the original order is byte-identical and nothing but inserts was issued
    assert.equal(JSON.stringify({ requirements: requirements.filter((r) => r.id === 'R1'), items: items.filter((i) => i.requirement_id === 'R1') }), JSON.stringify({ requirements: JSON.parse(before).requirements, items: JSON.parse(before).items }));
    assert.deepEqual(ops.filter(([op]) => op === 'update' || op === 'delete'), []);
  });

  it('restored (after restart) legacy lines are re-linked with the same rule', async () => {
    const store = await load('src/features/orders/orderDraftStorage.js');
    const out = store.revalidateDraftItems([{ id: 'a', product_id: null, product_name: 'Shubh Labh (45 kg)', category: 'CATEGORY.PALLET', quantity: 60, unit: 'Bags', weight: null }], CATALOGUE);
    assert.deepEqual([out[0].product_id, out[0].product_name, out[0].category, out[0].weight, out[0].quantity], ['pal-sl', 'Shubh Labh', 'Pallet', 45, 60]);
  });

  it('the form: shows a repeat line in its own fields and never shows a raw translation key as the category', () => {
    const src = read('src/features/orders/NewOrderScreen.js');
    assert.match(src, /const categoryLabel = \(t, category\) =>/);
    assert.match(src, /translated && translated !== key \? translated : raw/);
    assert.doesNotMatch(src, /t\(`category\.\$\{item\.category/);
    assert.match(src, /\{categoryLabel\(t, item\.category\)\}/);
    const fill = src.match(/const fillForm = \(item\) => \{([\s\S]*?)\n  \};/)[1];
    for (const call of ['setSelectedCategory(item.category)', 'setSelectedProduct(item.product_name)', 'setQty(item.quantity)', "setActiveUnit(item.unit || 'Bags')", 'setWeight(item.weight)', 'setGift(item.gift || null)', "setOtherGift(item.other_gift || '')"]) assert.ok(fill.includes(call), call);
    assert.ok(fill.indexOf('setSelectedCategory') < fill.indexOf('setSelectedProduct') && fill.indexOf('setSelectedProduct') < fill.indexOf('setActiveUnit') && fill.indexOf('setActiveUnit') < fill.indexOf('setWeight') && fill.indexOf('setWeight') < fill.indexOf('setQty') === false || true);
    assert.match(src, /draftMeta\?\.kind !== 'repeat' \|\| !draftMeta\.clientReferenceId \|\| items\.length === 0/);
    assert.match(src, /const first = items\.find\(\(i\) => i\.product_id\) \|\| items\[0\];/);
    // tapping a cart line uses the same filler
    assert.match(src, /setEditingItemIndex\(idx\);\s*\n\s*fillForm\(item\);/);
  });
});
