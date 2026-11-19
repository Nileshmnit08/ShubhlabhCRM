// SL-ORDER-REPEAT-ORDER-06 — Repeat Order shows the previous order's category / product FIRST.
// Real repeatOrder.js (ordering helpers + buildRepeatDraft); display-only ordering, nothing else changes.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '../../../..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// Catalogue order as the app lists it (products ordered by name). The products we repeat sit at the END.
const CATALOGUE = [
  { id: 'a1', name: 'Alpha', category: 'Feed', active: true },
  { id: 'a2', name: 'Beta', category: 'Feed', active: true },
  { id: 'a3', name: 'Gamma', category: 'Feed', active: true },
  { id: 'a4', name: 'Zeta', category: 'Feed', active: true },
  { id: 'c1', name: 'Chana Churi', category: 'Churi', active: true },
  { id: 'd1', name: 'Dry Mix', category: 'Mix', active: true },
  { id: 'd2', name: 'Lapti Mix', category: 'Mix', active: true },
  { id: 'p1', name: '8000', category: 'Pallet', active: true },
  { id: 'p2', name: 'Naman', category: 'Pallet', active: true },
  { id: 'p3', name: 'Shubh Labh', category: 'Pallet', active: true },
];
const P1 = { id: 'party-1' };
const line = (id, product_name, category, quantity, weight, extra = {}) => ({ id, product_name, category, quantity, unit: 'Bags', weight, gift: null, other_gift: null, ...extra });
const categoriesOf = (catalogue) => [...new Set(catalogue.map((p) => p.category))];

async function setup(lines) {
  const [rep, norm] = await Promise.all([load('src/features/orders/repeatOrder.js'), load('src/features/orders/orderNormalizer.js')]);
  const order = norm.normalizeOrder({ id: 'R1', party_id: 'party-1', demand_ref: 'D-1', status: 'Confirmed', notes: JSON.stringify({ address: 'x' }), requirement_items: lines });
  const draft = rep.buildRepeatDraft({ order, customerProfile: P1, catalogue: CATALOGUE });
  // what NewOrderScreen computes for the visible option lists
  const view = (items, selCategory, selProduct) => {
    const cats = rep.prioritizeOptions(categoriesOf(CATALOGUE), rep.repeatCategoryPriority(items), selCategory);
    const inCat = CATALOGUE.filter((p) => p.category === selCategory);
    const prods = rep.prioritizeProducts(inCat, rep.repeatProductPriority(items, selCategory), selProduct).map((p) => p.name);
    return { cats, prods };
  };
  return { rep, draft, view };
}

describe('Repeat Order option ordering', () => {
  it('1. one category, one product: both first and selected (Pallet → Shubh Labh, last in the catalogue)', async () => {
    const { draft, view } = await setup([line('1', 'Shubh Labh (45 kg)', 'Pallet', 60)]);
    const first = draft.items[0];
    const v = view(draft.items, first.category, first.product_name);
    assert.equal(v.cats[0], 'Pallet');
    assert.equal(v.prods[0], 'Shubh Labh');
    assert.deepEqual(v.cats, ['Pallet', 'Feed', 'Churi', 'Mix'], 'remaining categories follow in catalogue order');
    assert.deepEqual(v.prods, ['Shubh Labh', '8000', 'Naman'], 'remaining products follow in catalogue order');
  });

  it('2. multiple products: previous-order products first, in the previous order\'s line order, the rest afterwards', async () => {
    const { draft, view } = await setup([line('1', 'Zeta', 'Feed', 5, 50), line('2', 'Gamma', 'Feed', 6, 40), line('3', 'Alpha', 'Feed', 7, 35)]);
    const v = view(draft.items, 'Feed', 'Zeta');
    assert.deepEqual(v.prods, ['Zeta', 'Gamma', 'Alpha', 'Beta']);
  });

  it('3. several products in the same category: each stays selectable and near the front; selected one is first', async () => {
    const { draft, view } = await setup([line('1', 'Naman', 'Pallet', 3, 50), line('2', 'Shubh Labh', 'Pallet', 4, 45)]);
    assert.deepEqual(view(draft.items, 'Pallet', 'Naman').prods, ['Naman', 'Shubh Labh', '8000']);
    assert.deepEqual(view(draft.items, 'Pallet', 'Shubh Labh').prods, ['Shubh Labh', 'Naman', '8000'], 'tapping the second line pins that product first');
  });

  it('4. products from different categories: categories in line order, each category\'s own product first', async () => {
    const { draft, view } = await setup([line('1', 'Shubh Labh (45 kg)', 'Pallet', 60), line('2', 'Lapti Mix', 'Mix', 9, 30), line('3', 'Zeta', 'Feed', 2, 50)]);
    assert.deepEqual(view(draft.items, 'Pallet', 'Shubh Labh').cats, ['Pallet', 'Mix', 'Feed', 'Churi']);
    assert.deepEqual(view(draft.items, 'Mix', 'Lapti Mix').cats, ['Mix', 'Pallet', 'Feed', 'Churi'], 'selecting another line\'s category pins it first');
    assert.equal(view(draft.items, 'Mix', 'Lapti Mix').prods[0], 'Lapti Mix');
    assert.equal(view(draft.items, 'Feed', 'Zeta').prods[0], 'Zeta');
  });

  it('5. a product at the END of the catalogue is visible first (not hidden behind horizontal scrolling)', async () => {
    const { draft, view } = await setup([line('1', 'Zeta', 'Feed', 11, 50)]);
    const catalogueIndex = CATALOGUE.filter((p) => p.category === 'Feed').findIndex((p) => p.name === 'Zeta');
    assert.equal(catalogueIndex, 3);
    assert.equal(view(draft.items, 'Feed', 'Zeta').prods.indexOf('Zeta'), 0);
  });

  it('a customer browsing to a category / product that was NOT in the previous order does not make the list jump', async () => {
    const { rep, draft, view } = await setup([line('1', 'Shubh Labh', 'Pallet', 60)]);
    const v = view(draft.items, 'Mix', 'Dry Mix');
    assert.deepEqual(v.cats, ['Pallet', 'Feed', 'Churi', 'Mix'], 'Pallet stays first, Mix stays where the catalogue puts it');
    assert.deepEqual(v.prods, ['Dry Mix', 'Lapti Mix']);
    assert.deepEqual(rep.prioritizeOptions(['a', 'b'], ['b'], 'a'), ['b', 'a'], 'a selected non-previous option is not moved');
  });

  it('a discontinued product / unknown category in the previous order is ignored in the lists (no phantom chip)', async () => {
    const { draft, view } = await setup([line('1', 'Gold Special', 'Pallet', 4, 50), line('2', 'Naman', 'Pallet', 5, 50)]);
    const v = view(draft.items, 'Pallet', 'Naman');
    assert.deepEqual(v.prods, ['Naman', '8000', 'Shubh Labh']);
    assert.ok(!v.prods.includes('Gold Special'));
  });

  it('6. quantity, unit, weight and gifts are untouched by the ordering', async () => {
    const { draft } = await setup([
      line('1', 'Shubh Labh (45 kg)', 'Pallet', 60, 45, { gift: 'Others', other_gift: 'Steel Glass' }),
      line('2', 'Zeta', 'Feed', 5, 50, { unit: 'MT', gift: 'Katora' }),
    ]);
    const snapshot = JSON.stringify(draft.items);
    const rep = await load('src/features/orders/repeatOrder.js');
    rep.repeatCategoryPriority(draft.items); rep.repeatProductPriority(draft.items, 'Pallet');
    rep.prioritizeOptions(categoriesOf(CATALOGUE), ['Pallet'], 'Pallet'); rep.prioritizeProducts(CATALOGUE, ['Naman'], 'Naman');
    assert.equal(JSON.stringify(draft.items), snapshot, 'the draft lines are not mutated');
    assert.deepEqual(draft.items.map((i) => [i.product_name, i.quantity, i.unit, i.weight, i.gift, i.other_gift]), [
      ['Shubh Labh', 60, 'Bags', 45, 'Others', 'Steel Glass'], ['Zeta', 5, 'MT', 50, 'Katora', ''],
    ]);
    const src = read('src/features/orders/NewOrderScreen.js');
    const ordering = src.slice(src.indexOf('Repeat Order only: the previous order'), src.indexOf('productScrollRef.current?.scrollTo'));
    assert.doesNotMatch(ordering, /set(Qty|ActiveUnit|Weight|Gift|OtherGift|Items|SelectedProduct|SelectedCategory)\(/, 'ordering code never sets a value');
  });

  it('7. normal New Order keeps the catalogue order; the master catalogue is never reordered', async () => {
    const rep = await load('src/features/orders/repeatOrder.js');
    const before = JSON.stringify(CATALOGUE);
    rep.prioritizeProducts(CATALOGUE, ['Shubh Labh'], 'Shubh Labh');
    rep.prioritizeOptions(categoriesOf(CATALOGUE), ['Pallet'], 'Pallet');
    assert.equal(JSON.stringify(CATALOGUE), before);
    const src = read('src/features/orders/NewOrderScreen.js');
    assert.match(src, /const categoriesShown = isRepeatDraft\s*\n\s*\? prioritizeOptions\(categories, repeatCategoryPriority\(items\), selectedCategory\)\s*\n\s*: categories;/);
    assert.match(src, /const productsShown = isRepeatDraft\s*\n\s*\? prioritizeProducts\([^\n]+\)\s*\n\s*: currentCategoryProducts;/);
    assert.match(src, /const isRepeatDraft = draftMeta\?\.kind === 'repeat';/);
    assert.match(src, /\{categoriesShown\.map\(c => \(/);
    assert.match(src, /productsShown\.map\(p => \(/);
    // only lines that came from the previous order count (lines the customer adds later do not take over the top)
    assert.deepEqual(rep.repeatCategoryPriority([{ category: 'Mix' }, { category: 'Feed', source_item_id: 'x' }]), ['Feed']);
  });

  it('the selected option scrolls into view: both lists return to the start when the pinned selection changes (any screen width)', () => {
    const src = read('src/features/orders/NewOrderScreen.js');
    assert.match(src, /<ScrollView ref=\{categoryScrollRef\} horizontal/);
    assert.match(src, /<ScrollView ref=\{productScrollRef\} horizontal/);
    assert.match(src, /categoryScrollRef\.current\?\.scrollTo\(\{ x: 0, animated: false \}\);\s*\n\s*productScrollRef\.current\?\.scrollTo\(\{ x: 0, animated: false \}\);/);
    assert.match(src, /if \(!isRepeatDraft\) return;/, 'normal New Order scroll behaviour is untouched');
    assert.match(src, /showsHorizontalScrollIndicator=\{false\} contentContainerStyle=\{\{gap: 8, paddingBottom: 16\}\}/, 'horizontal scrolling for the remaining options is kept');
  });
});
