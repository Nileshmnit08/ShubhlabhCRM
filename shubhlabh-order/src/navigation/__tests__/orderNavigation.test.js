const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

// SL-ORDER-NEW-ORDER-CONSISTENCY-01
// Run: node --test src/navigation/__tests__/orderNavigation.test.js   (from shubhlabh-order/)
const root = path.resolve(__dirname, '../../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

let nav;
before(async () => {
  nav = await import(pathToFileURL(path.join(root, 'src/navigation/orderNavigation.js')).href);
});

// A navigation object that records navigate() calls. rootState = what getRootState() returns.
const fakeNav = (rootState = null) => {
  const calls = [];
  return { calls, navigate: (...args) => calls.push(args), getRootState: () => rootState };
};
const stateWithFlow = (name = 'NewOrderTab') => ({ routes: [{ name: 'MainTabs' }, { name }], index: 1 });
const stateWithoutFlow = () => ({ routes: [{ name: 'MainTabs' }], index: 0 });
const clock = (start = 1_000) => { let t = start; return { now: () => t, advance: (ms) => { t += ms; } }; };
const order = { id: 'o-1', items: [{ product_name: 'Feed', quantity: 2 }] };

describe('Shared order-start action (src/navigation/orderNavigation.js)', () => {
  it('builds ONE navigate call to the root New Order flow with a fresh session marker', () => {
    const built = nav.buildOrderFlowNavigation({ kind: 'new', ts: 42 });
    assert.deepEqual(built, {
      name: 'NewOrderTab',
      params: { screen: 'NewOrderMain', params: { mode: 'create', ts: 42 }, pop: true },
      options: { pop: true },
    });
    // The legacy broken shape must never be produced: NewOrderTab is a root route, not a MainTabs tab.
    assert.notEqual(built.name, 'MainTabs');
  });

  it('Place New Order → create; Reorder → reorder + previous order; Edit → edit + previous order', () => {
    assert.equal(nav.buildOrderFlowNavigation({ kind: 'new', ts: 1 }).params.params.mode, 'create');
    const re = nav.buildOrderFlowNavigation({ kind: 'reorder', order, ts: 2 }).params.params;
    assert.deepEqual([re.mode, re.previousOrder, re.ts], ['reorder', order, 2]);
    const ed = nav.buildOrderFlowNavigation({ kind: 'edit', order, ts: 3 }).params.params;
    assert.deepEqual([ed.mode, ed.previousOrder, ed.ts], ['edit', order, 3]);
    assert.equal('previousOrder' in nav.buildOrderFlowNavigation({ kind: 'new', ts: 4 }).params.params, false, 'a fresh order never carries a previous order');
  });

  it('Reorder / Edit without a usable order do nothing (no empty or duplicate order)', () => {
    for (const kind of ['reorder', 'edit']) {
      assert.equal(nav.buildOrderFlowNavigation({ kind, order: null }), null);
      assert.equal(nav.buildOrderFlowNavigation({ kind, order: {} }), null, 'an order without an id cannot be edited/repeated');
    }
    assert.equal(nav.buildOrderFlowNavigation({ kind: 'bogus' }), null);
  });

  it('session markers strictly increase, even inside the same millisecond', () => {
    const a = nav.nextSessionTs(9_000_000_000_000);
    const b = nav.nextSessionTs(9_000_000_000_000);
    const c = nav.nextSessionTs(1);
    assert.ok(a < b && b < c);
  });

  it('repeated taps start ONE order; a later tap is a new request', async () => {
    const c = clock();
    const guard = nav.createTapGuard({ windowMs: 800, now: c.now });
    const n = fakeNav(stateWithoutFlow());
    assert.equal(await nav.requestOrderStart(n, { kind: 'new' }, { guard }), 'started');
    c.advance(100);
    assert.equal(await nav.requestOrderStart(n, { kind: 'new' }, { guard }), 'ignored');
    c.advance(100);
    assert.equal(await nav.requestOrderStart(n, { kind: 'reorder', order }, { guard }), 'ignored', 'a different order button tapped together is also ignored');
    assert.equal(n.calls.length, 1, 'exactly one navigate call');
    c.advance(1_000);
    assert.equal(await nav.requestOrderStart(n, { kind: 'new' }, { guard }), 'started');
    assert.equal(n.calls.length, 2);
  });

  it('ignores a missing/invalid navigation object without throwing', async () => {
    assert.equal(await nav.requestOrderStart(null, { kind: 'new' }, { guard: nav.createTapGuard() }), 'ignored');
    assert.equal(await nav.requestOrderStart({}, { kind: 'new' }, { guard: nav.createTapGuard() }), 'ignored');
  });

  it('unfinished draft with the flow still open: customer chooses CONTINUE → resume, session untouched', async () => {
    const n = fakeNav(stateWithFlow());
    const asked = [];
    const out = await nav.requestOrderStart(n, { kind: 'new' }, { guard: nav.createTapGuard(), hasDraft: true, askDraft: async (k) => { asked.push(k); return 'continue'; } });
    assert.deepEqual([out, asked], ['resumed', ['new']]);
    assert.deepEqual(n.calls, [['NewOrderTab', undefined, { pop: true, merge: true }]], 'no params → the cart screen keeps the same session');
  });

  it('unfinished draft: customer chooses START NEW → fresh session', async () => {
    const n = fakeNav(stateWithFlow());
    const out = await nav.requestOrderStart(n, { kind: 'new' }, { guard: nav.createTapGuard(), hasDraft: true, askDraft: async () => 'new' });
    assert.equal(out, 'started');
    assert.equal(n.calls.length, 1);
    assert.equal(n.calls[0][1].params.mode, 'create');
  });

  it('unfinished draft: customer CANCELS → nothing happens and the next tap works immediately', async () => {
    const c = clock();
    const guard = nav.createTapGuard({ windowMs: 800, now: c.now });
    const n = fakeNav(stateWithFlow());
    assert.equal(await nav.requestOrderStart(n, { kind: 'new' }, { guard, hasDraft: true, askDraft: async () => 'cancel' }), 'cancelled');
    assert.equal(n.calls.length, 0);
    assert.equal(await nav.requestOrderStart(n, { kind: 'new' }, { guard, hasDraft: false }), 'started', 'guard was released');
  });

  it('no prompt without a draft, or when the draft is no longer open in the stack', async () => {
    const boom = async () => { throw new Error('must not ask'); };
    const noDraft = fakeNav(stateWithFlow());
    assert.equal(await nav.requestOrderStart(noDraft, { kind: 'new' }, { guard: nav.createTapGuard(), hasDraft: false, askDraft: boom }), 'started');
    const noFlow = fakeNav(stateWithoutFlow());
    assert.equal(await nav.requestOrderStart(noFlow, { kind: 'new' }, { guard: nav.createTapGuard(), hasDraft: true, askDraft: boom }), 'started');
  });

  it('Reorder / Edit also protect an unfinished draft', async () => {
    for (const kind of ['reorder', 'edit']) {
      const n = fakeNav(stateWithFlow());
      const asked = [];
      const out = await nav.requestOrderStart(n, { kind, order }, { guard: nav.createTapGuard(), hasDraft: true, askDraft: async (k) => { asked.push(k); return 'new'; } });
      assert.deepEqual([out, asked, n.calls[0][1].params.mode], ['started', [kind], kind]);
    }
  });

  it('finds the order flow from a container ref and from a nested screen navigation', () => {
    const state = stateWithFlow('NewOrderStack');
    assert.deepEqual(nav.findOrderFlowRoute(state), { name: 'NewOrderStack' }, 'the NewOrderStack alias counts as the same flow');
    assert.equal(nav.findOrderFlowRoute(stateWithoutFlow()), null);
    assert.equal(nav.findOrderFlowRoute(null), null);
    // container ref: has getRootState
    assert.equal(nav.getRootState(fakeNav(state)), state);
    // screen navigation: only getParent()/getState(); the root is reached through the parents
    const rootNav = { getParent: () => undefined, getState: () => state };
    const tabNav = { getParent: () => rootNav, getState: () => ({}) };
    const stackNav = { getParent: () => tabNav, getState: () => ({}) };
    assert.equal(nav.getRootState(stackNav), state);
    assert.equal(nav.getRootState(null), null);
  });

  it('Help FAQ targets that mean "start an order" are recognised', () => {
    assert.equal(nav.isOrderStartAction('NewOrderTab'), true);
    assert.equal(nav.isOrderStartAction('NewOrderStack'), true);
    for (const other of ['OrdersTab', 'ProfileTab', 'HomeTab', undefined]) assert.equal(nav.isOrderStartAction(other), false);
  });
});

describe('Fresh order session vs returning to a draft (planSessionInit)', () => {
  const plan = (o) => nav.planSessionInit({ mode: 'create', ts: 1, initializedTs: null, productsReady: true, ...o });

  it('a new session starts a fresh cart; the same session keeps the draft', () => {
    assert.equal(plan({}), 'fresh');
    assert.equal(plan({ initializedTs: 1 }), 'keep', 'returning to the screen with the same session never clears the cart');
    assert.equal(plan({ ts: 2, initializedTs: 1 }), 'fresh', 'a new session marker (Place New Order again) clears it');
  });

  it('a screen opened without a marker starts fresh once, then keeps the cart', () => {
    assert.equal(plan({ ts: undefined }), 'fresh');
    assert.equal(plan({ ts: undefined, initializedTs: undefined }), 'keep');
  });

  it('reorder / edit load the previous order once the product list is ready', () => {
    assert.equal(plan({ mode: 'reorder', productsReady: false }), 'wait');
    assert.equal(plan({ mode: 'reorder' }), 'load-reorder');
    assert.equal(plan({ mode: 'edit' }), 'load-edit');
    assert.equal(plan({ mode: 'reorder', initializedTs: 1 }), 'keep');
    assert.equal(plan({ mode: 'edit', ts: 5, initializedTs: 1 }), 'load-edit');
    assert.equal(plan({ mode: 'mystery' }), 'mark');
  });

  it('NewOrderScreen decides through planSessionInit (no private reset logic)', () => {
    const src = read('src/features/orders/NewOrderScreen.js');
    assert.match(src, /planSessionInit\(\{ mode, ts, initializedTs: initRef\.current/);
    assert.match(src, /plan === 'fresh'[\s\S]*startNewOrder\(\)/);
    assert.doesNotMatch(src, /if \(mode === 'create'\) \{/, 'the old inline reset branch is gone');
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Test matrix: EVERY order-starting button found in the app (see the audit inventory).
// ─────────────────────────────────────────────────────────────────────────────────────────────
const RAW_FLOW_NAVIGATION = /navigate\([^)]*['"](NewOrderTab|NewOrderStack|NewOrderMain)['"]/;
const MATRIX = [
  { id: 1, screen: 'Home', file: 'src/features/home/HomeScreen.js', label: 'Place New Order (primary call-to-action card)', kind: 'new', must: [/style=\{styles\.primaryCta\}\s*\n\s*onPress=\{startNewOrder\}/, /t\('home\.placeNewOrder'\)/] },
  { id: 2, screen: 'Home', file: 'src/features/home/HomeScreen.js', label: 'Place New Order (Quick Actions tile)', kind: 'new', must: [/style=\{styles\.quickActionCard\}\s*\n\s*onPress=\{startNewOrder\}/] },
  { id: 3, screen: 'Home (no active order card)', file: 'src/features/home/HomeScreen.js', label: 'Place New Order (standard button)', kind: 'new', must: [/<PlaceNewOrderButton \/>/] },
  { id: 4, screen: 'My Orders → Active (empty state)', file: 'src/features/orders/MyOrdersScreen.js', label: 'Place New Order (standard button)', kind: 'new', must: [/activeTab === 'ACTIVE' && <PlaceNewOrderButton \/>/] },
  { id: 5, screen: 'Help (every screen)', file: 'src/shared/components/GlobalHelpFab.js', label: 'FAQ "How can I place an order?" → Go', kind: 'new', must: [/isOrderStartAction\(msg\.action\)/, /startNewOrder\(\);/] },
  { id: 6, screen: 'Legacy order list (unmounted)', file: 'src/features/orders/MeriOrderListScreen.js', label: 'Browse products', kind: 'new', must: [/title=\{t\('order\.browseProducts'\)\}\s*\n\s*onPress=\{startNewOrder\}/] },
  { id: 7, screen: 'Legacy order list (unmounted)', file: 'src/features/orders/MeriOrderListScreen.js', label: 'Continue shopping', kind: 'new', must: [/variant="secondary"\s*\n\s*onPress=\{startNewOrder\}/] },
  { id: 8, screen: 'Home → Current order header', file: 'src/features/home/HomeScreen.js', label: 'Reorder', kind: 'reorder', must: [/reorder\(latestOrder\)/, /onActionPress=\{latestOrder \? handleReorder : undefined\}/] },
  { id: 9, screen: 'Home → Current order card', file: 'src/features/home/HomeScreen.js', label: 'Repeat Order', kind: 'reorder', must: [/onPress=\{handleReorder\}>\s*\n\s*<SLText style=\{styles\.quickReorderText\}>Repeat Order/] },
  { id: 10, screen: 'Order Detail', file: 'src/features/orders/OrderDetailScreen.js', label: 'Repeat Order', kind: 'reorder', must: [/const handleReorderOrder = \(\) => reorder\(order\);/] },
  { id: 11, screen: 'Order Detail', file: 'src/features/orders/OrderDetailScreen.js', label: 'Edit Order', kind: 'edit', must: [/const handleEditOrder = \(\) => editOrder\(order\);/] },
];

describe('Every order-starting button uses the one shared action (test matrix)', () => {
  for (const row of MATRIX) {
    it(`#${row.id} ${row.screen} — "${row.label}" [${row.kind}]`, () => {
      const src = read(row.file);
      for (const re of row.must) assert.match(src, re);
      assert.doesNotMatch(src, RAW_FLOW_NAVIGATION, `${row.file} must not navigate to the order flow directly`);
      assert.doesNotMatch(src, /params:\s*\{\s*screen:\s*'NewOrder/, 'no hand-built nested New Order params');
    });
  }

  it('screens that use the action get it from useOrderNavigation()', () => {
    const expected = {
      'src/features/home/HomeScreen.js': /const \{ startNewOrder, reorder \} = useOrderNavigation\(\);/,
      'src/features/orders/OrderDetailScreen.js': /const \{ reorder, editOrder \} = useOrderNavigation\(\);/,
      'src/features/orders/MeriOrderListScreen.js': /const \{ startNewOrder \} = useOrderNavigation\(\);/,
      'src/shared/components/GlobalHelpFab.js': /const \{ startNewOrder \} = useOrderNavigation\(\);/,
      'src/features/orders/PlaceNewOrderButton.js': /const \{ startNewOrder \} = useOrderNavigation\(\);/,
    };
    for (const [file, re] of Object.entries(expected)) assert.match(read(file), re, file);
  });

  it('NO file outside the shared module navigates to the order flow directly', () => {
    const files = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== '__tests__') walk(p); } else if (p.endsWith('.js')) files.push(p);
      }
    };
    walk(path.join(root, 'src'));
    const offenders = files
      .filter((f) => !f.endsWith(path.join('navigation', 'orderNavigation.js')))
      .filter((f) => RAW_FLOW_NAVIGATION.test(fs.readFileSync(f, 'utf8')) || /screen:\s*['"]NewOrderTab['"]/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(root, f));
    assert.deepEqual(offenders, []);
  });

  it('the broken legacy shape (MainTabs → NewOrderTab) is gone everywhere', () => {
    const bad = /navigate\(\s*['"]MainTabs['"][^)]*NewOrderTab/;
    for (const f of ['HomeScreen.js', 'MyOrdersScreen.js', 'OrderDetailScreen.js', 'MeriOrderListScreen.js'].map((n) => {
      return n === 'HomeScreen.js' ? 'src/features/home/HomeScreen.js' : `src/features/orders/${n}`;
    })) assert.doesNotMatch(read(f), bad, f);
  });

  it('screens that legitimately have NO order-start button stay that way (nothing to fix there)', () => {
    for (const f of ['src/features/profile/ProfileScreen.js', 'src/features/market/MarketPricesScreen.js', 'src/features/orders/OrderSuccessScreen.js', 'src/features/orders/OrderTrackingScreen.js']) {
      assert.doesNotMatch(read(f), /NewOrderTab|startNewOrder|useOrderNavigation/, f);
    }
  });
});

describe('Consistent wording, touch target and loading behaviour', () => {
  it('the standard button uses the shared label, a 48dp target, a loading state and the shared action', () => {
    const src = read('src/features/orders/PlaceNewOrderButton.js');
    assert.match(src, /title=\{t\('home\.placeNewOrder'\)\}/);
    assert.match(src, /height: 48/);
    assert.match(src, /loading=\{busy\}/);
    assert.match(src, /await startNewOrder\(\)/);
  });

  it('the label is "Place New Order" (English) and has a Hindi translation; no hard-coded duplicates remain', () => {
    assert.match(read('src/shared/localization/en.js'), /'home\.placeNewOrder': 'Place New Order'/);
    assert.match(read('src/shared/localization/hi.js'), /'home\.placeNewOrder': '[^']+'/);
    assert.doesNotMatch(read('src/features/orders/MyOrdersScreen.js'), /'Place New Order'/);
  });

  it('the unfinished-order prompt is translated in both languages', () => {
    for (const lang of ['en', 'hi']) {
      const src = read(`src/shared/localization/${lang}.js`);
      for (const key of ['newOrder.draftTitle', 'newOrder.draftMessage', 'newOrder.draftContinue', 'newOrder.draftStartNew']) {
        assert.match(src, new RegExp(`'${key.replace('.', '\\.')}': '[^']+'`), `${lang}: ${key}`);
      }
    }
  });
});

describe('Architecture and cart safety preserved', () => {
  it('New Order stays a root-stack flow; the four-tab bar is defined once; no duplicated bottom bars', () => {
    const app = read('App.js');
    assert.match(app, /<Stack\.Screen name="MainTabs" component=\{MainTabNavigator\} \/>/);
    assert.match(app, /<Stack\.Screen name="NewOrderTab" component=\{NewOrderStackNavigator\} \/>/);
    const flow = read('src/navigation/NewOrderStackNavigator.js');
    for (const s of ['NewOrderMain', 'OrderReview', 'OrderSuccess']) assert.match(flow, new RegExp(`name="${s}"`));
    const tabBarOwners = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== '__tests__') walk(p); } else if (p.endsWith('.js') && /createBottomTabNavigator\(\)/.test(fs.readFileSync(p, 'utf8'))) tabBarOwners.push(path.relative(root, p));
      }
    };
    walk(path.join(root, 'src'));
    assert.deepEqual(tabBarOwners, [path.join('src', 'navigation', 'MainTabNavigator.js')]);
  });

  it('cart logic, submission and pricing files are not touched by the navigation change', () => {
    const svc = read('src/features/orders/OrderReviewScreen.js');
    assert.match(svc, /navigation\.navigate\('OrderSuccess', \{ orderData: result\.orderData \}\)/);
    assert.match(svc, /if \(clearCallback\) clearCallback\(\)/);
    const ctx = read('src/features/orders/OrderListContext.js');
    for (const fn of ['startNewOrder', 'loadOrderForEdit', 'loadRepeatDraft', 'addToOrderList', 'updateQuantity', 'removeFromOrderList', 'clearOrderList']) assert.match(ctx, new RegExp(`const ${fn} = `));
  });

  it('the draft check is a stable read-only view of the cart (screens do not re-render on every cart edit)', () => {
    const ctx = read('src/features/orders/OrderListContext.js');
    assert.match(ctx, /const draftApi = useMemo\(\(\) => \(\{\s*hasDraft: \(\) => draftCountRef\.current > 0,\s*hasSavedDraft: \(\) => savedDraftRef\.current,\s*\}\), \[\]\);/);
    assert.match(ctx, /export function useOrderDraft\(\)/);
    assert.match(read('src/navigation/useOrderNavigation.js'), /useOrderDraft\(\)/);
    assert.doesNotMatch(read('src/navigation/useOrderNavigation.js'), /useOrderList\(\)/, 'the hook must not subscribe to cart changes');
  });
});
