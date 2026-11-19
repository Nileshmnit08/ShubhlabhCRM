const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

// SL-ORDER-NEW-ORDER-CONSISTENCY-01 — behaviour of the shared order-start action on the REAL
// React Navigation routers installed in this project (StackRouter / TabRouter / useNavigationBuilder),
// arranged exactly like App.js: root Stack → MainTabs (4 tab stacks) + NewOrderTab (New Order flow).
//
// Only the native rendering of the stack/tab navigators is replaced by minimal views; every routing
// decision is made by the real routers. Needs `react-test-renderer` (dev-only, not a project dependency):
//     npm i --no-save react-test-renderer@19.2.3     then     node --test src/navigation/__tests__/orderFlowRealRouter.test.js
// Without it the suite is skipped (the dependency-free suite orderNavigation.test.js always runs).
const root = path.resolve(__dirname, '../../..');
let TestRenderer = null;
try { TestRenderer = require('react-test-renderer'); } catch (e) { /* optional */ }
const skip = TestRenderer ? false : 'react-test-renderer is not installed (npm i --no-save react-test-renderer@19.2.3)';

let React; let core; let routers; let nav;
before(async () => {
  if (!TestRenderer) return;
  React = require('react');
  core = require('@react-navigation/core');
  routers = require('@react-navigation/routers');
  nav = await import(pathToFileURL(path.join(root, 'src/navigation/orderNavigation.js')).href);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

function makeNavigator(Router, lazy) {
  const h = React.createElement;
  function Nav({ id, initialRouteName, children, screenOptions, backBehavior }) {
    const { state, descriptors, NavigationContent } = core.useNavigationBuilder(Router, { id, initialRouteName, children, screenOptions, backBehavior });
    const visited = React.useRef(new Set());
    visited.current.add(state.routes[state.index].key);
    return h(NavigationContent, null, state.routes.map((r) => ((lazy && !visited.current.has(r.key)) ? null : h(React.Fragment, { key: r.key }, descriptors[r.key].render()))));
  }
  return core.createNavigatorFactory(Nav)();
}

function build() {
  const h = React.createElement;
  const Stack = makeNavigator(routers.StackRouter, false); // native-stack keeps every route mounted
  const Tabs = makeNavigator(routers.TabRouter, true);     // bottom-tabs mounts a tab on first focus
  const navs = {};
  const Screen = (name) => function Stub({ navigation }) { navs[name] = navigation; return null; };
  const stack = (names) => function StackOf() { return h(Stack.Navigator, { screenOptions: { headerShown: false } }, names.map((n) => h(Stack.Screen, { key: n, name: n, component: Screen(n) }))); };
  const HomeStack = stack(['HomeMain', 'BusinessUpdatesList', 'BusinessUpdateDetail', 'NotificationInbox', 'WeatherDetails', 'MyRewardSchemes', 'RewardDetail']);
  const ProductsStack = stack(['MarketPrices', 'Watchlist']);
  const OrdersStack = stack(['MyOrders', 'OrderDetail', 'OrderTracking']);
  const ProfileStack = stack(['ProfileMain', 'BusinessProfile', 'Settings', 'DeliveryAddress']);
  const FlowStack = stack(['NewOrderMain', 'OrderReview', 'OrderSuccess']);
  function MainTabs() {
    return h(Tabs.Navigator, { initialRouteName: 'HomeTab', backBehavior: 'initialRoute' },
      h(Tabs.Screen, { name: 'HomeTab', component: HomeStack }), h(Tabs.Screen, { name: 'ProductsTab', component: ProductsStack }),
      h(Tabs.Screen, { name: 'OrdersTab', component: OrdersStack }), h(Tabs.Screen, { name: 'ProfileTab', component: ProfileStack }));
  }
  function Root() {
    return h(Stack.Navigator, { initialRouteName: 'MainTabs', screenOptions: { headerShown: false } },
      h(Stack.Screen, { name: 'MainTabs', component: MainTabs }),
      h(Stack.Screen, { name: 'NewOrderTab', component: FlowStack }),
      h(Stack.Screen, { name: 'NewOrderStack', component: FlowStack }));
  }
  const ref = core.createNavigationContainerRef();
  let renderer;
  const origError = console.error; const origWarn = console.warn;
  console.error = () => {}; console.warn = () => {};
  const errors = [];
  TestRenderer.act(() => { renderer = TestRenderer.create(h(core.BaseNavigationContainer, { ref }, h(Root))); });
  console.error = (...a) => errors.push(a.map(String).join(' '));
  console.warn = (...a) => errors.push(a.map(String).join(' '));
  return {
    ref, navs, errors,
    run: async (fn) => { let out; await React.act(async () => { out = await fn(); }); return out; },
    state: () => ref.getRootState(),
    done: () => { console.error = origError; console.warn = origWarn; TestRenderer.act(() => renderer.unmount()); },
  };
}
const focusedPath = (state) => { const out = []; let s = state; while (s) { const r = s.routes[s.index]; out.push(r.name); s = r.state; } return out.join(' > '); };
const focusedRoute = (state) => { let s = state; let r = null; while (s) { r = s.routes[s.index]; s = r.state; } return r; };
const count = (state, name) => { let n = 0; const walk = (s) => s.routes.forEach((r) => { if (r.name === name) n += 1; if (r.state) walk(r.state); }); walk(state); return n; };
const flowStack = (state) => { const r = state.routes.find((x) => x.name === 'NewOrderTab'); return r && r.state ? r.state.routes.map((x) => x.name) : null; };
const order = { id: 'o-1', items: [{ product_name: 'Feed', quantity: 2 }] };
const freshGuard = () => { let t = 1e9; return { guard: nav.createTapGuard({ windowMs: 800, now: () => (t += 1000) }) }; };

// Without react-test-renderer the suite reports ONE visible skipped test instead of vanishing silently.
const registerSuite = (fn) => {
  const title = 'Order flow on the real React Navigation routers';
  if (TestRenderer) return describe(title, fn);
  return describe(title, () => { it(`SKIPPED — ${skip}`, { skip }, () => {}); });
};

registerSuite(() => {
  const withApp = async (fn) => { const t = build(); try { await fn(t); } finally { t.done(); } };
  const goOrders = (t) => t.run(() => t.ref.navigate('MainTabs', { screen: 'OrdersTab', params: { screen: 'MyOrders' } }));
  const goDetail = async (t) => { await goOrders(t); await t.run(() => t.navs.MyOrders.navigate('OrderDetail', { orderId: 'o-1' })); };
  const expectSingleFlow = (t, mode) => {
    assert.equal(focusedPath(t.state()), 'NewOrderTab > NewOrderMain');
    assert.equal(focusedRoute(t.state()).params.mode, mode);
    assert.deepEqual([count(t.state(), 'NewOrderTab'), count(t.state(), 'NewOrderMain'), count(t.state(), 'MainTabs')], [1, 1, 1]);
    assert.equal(t.errors.filter((e) => /couldn't be applied|not handled/i.test(e)).length, 0, 'the router rejected nothing');
  };

  it('ROOT CAUSE: the legacy shape MainTabs → NewOrderTab is rejected by the router, so those buttons did nothing', async () => {
    await withApp(async (t) => {
      await goDetail(t);
      const before = focusedPath(t.state());
      t.errors.length = 0;
      await t.run(() => t.navs.OrderDetail.navigate('MainTabs', { screen: 'NewOrderTab', params: { screen: 'NewOrderMain', params: { mode: 'reorder', ts: 1 } } }));
      assert.equal(focusedPath(t.state()), before, 'still on Order Detail: nothing opened');
      assert.ok(t.errors.some((e) => /couldn't be applied to the navigator/i.test(e)), 'router: the screen is not in the tab navigator');
      assert.equal(count(t.state(), 'NewOrderMain'), 0);
    });
  });

  it('Place New Order from EVERY main tab and from the Help button opens the same New Order screen', async () => {
    const sources = {
      'Home': { setup: async () => {}, from: (t) => t.navs.HomeMain },
      'My Orders': { setup: goOrders, from: (t) => t.navs.MyOrders },
      'Products': { setup: (t) => t.run(() => t.ref.navigate('MainTabs', { screen: 'ProductsTab' })), from: (t) => t.navs.MarketPrices },
      'Profile': { setup: (t) => t.run(() => t.ref.navigate('MainTabs', { screen: 'ProfileTab' })), from: (t) => t.navs.ProfileMain },
      'Help button on Home (container)': { setup: async () => {}, from: (t) => t.ref },
      'Help button on My Orders (container)': { setup: goOrders, from: (t) => t.ref },
      'Help button on Profile (container)': { setup: (t) => t.run(() => t.ref.navigate('MainTabs', { screen: 'ProfileTab' })), from: (t) => t.ref },
    };
    for (const [label, src] of Object.entries(sources)) {
      await withApp(async (t) => {
        await src.setup(t);
        const out = await t.run(() => nav.requestOrderStart(src.from(t), { kind: 'new' }, freshGuard()));
        assert.equal(out, 'started', label);
        expectSingleFlow(t, 'create');
      });
    }
  });

  it('Reorder and Edit open the same screen with the previous order (Home and Order Detail)', async () => {
    await withApp(async (t) => {
      await t.run(() => nav.requestOrderStart(t.navs.HomeMain, { kind: 'reorder', order }, freshGuard()));
      expectSingleFlow(t, 'reorder');
      assert.equal(focusedRoute(t.state()).params.previousOrder.id, 'o-1');
    });
    for (const kind of ['reorder', 'edit']) {
      await withApp(async (t) => {
        await goDetail(t);
        await t.run(() => nav.requestOrderStart(t.navs.OrderDetail, { kind, order }, freshGuard()));
        expectSingleFlow(t, kind);
        assert.equal(focusedRoute(t.state()).params.previousOrder.id, 'o-1');
      });
    }
  });

  it('Reorder keeps its previous items; Place New Order never carries them (fresh order)', async () => {
    await withApp(async (t) => {
      await t.run(() => nav.requestOrderStart(t.navs.HomeMain, { kind: 'new' }, freshGuard()));
      assert.equal('previousOrder' in focusedRoute(t.state()).params, false);
    });
  });

  it('repeated taps open ONE New Order screen', async () => {
    await withApp(async (t) => {
      const outs = [];
      await t.run(async () => {
        outs.push(await nav.requestOrderStart(t.navs.HomeMain, { kind: 'new' }));
        outs.push(await nav.requestOrderStart(t.navs.HomeMain, { kind: 'new' }));
        outs.push(await nav.requestOrderStart(t.navs.HomeMain, { kind: 'reorder', order }));
      });
      assert.deepEqual(outs, ['started', 'ignored', 'ignored']);
      expectSingleFlow(t, 'create');
    });
  });

  it('even slow repeats (guard expired, screen already open) never stack a second flow', async () => {
    await withApp(async (t) => {
      await t.run(() => nav.requestOrderStart(t.navs.HomeMain, { kind: 'new' }, freshGuard()));
      await t.run(() => nav.requestOrderStart(t.navs.HomeMain, { kind: 'new' }, freshGuard()));
      await t.run(() => nav.requestOrderStart(t.ref, { kind: 'new' }, freshGuard()));
      expectSingleFlow(t, 'create');
    });
  });

  it('a new Place New Order gets a NEW session marker (so the cart is reset); returning keeps the old one', async () => {
    await withApp(async (t) => {
      await t.run(() => nav.requestOrderStart(t.navs.HomeMain, { kind: 'new' }, freshGuard()));
      const first = focusedRoute(t.state()).params.ts;
      await t.run(() => t.navs.NewOrderMain.navigate('OrderReview', { finalItems: [{}] }));
      await t.run(() => t.navs.OrderReview.goBack());
      assert.equal(focusedRoute(t.state()).params.ts, first, 'Back from Order Review: same session → cart kept');
      await t.run(() => nav.requestOrderStart(t.ref, { kind: 'new' }, freshGuard()));
      assert.ok(focusedRoute(t.state()).params.ts > first, 'Place New Order again: new session → cart reset');
      assert.deepEqual(flowStack(t.state()), ['NewOrderMain'], 'the flow is back to its first screen');
    });
  });

  it('Back from New Order returns to the screen that started it (tab and screen preserved)', async () => {
    const cases = {
      'Home': { setup: async () => {}, from: (t) => t.navs.HomeMain, expect: 'MainTabs > HomeTab > HomeMain' },
      'My Orders': { setup: goOrders, from: (t) => t.navs.MyOrders, expect: 'MainTabs > OrdersTab > MyOrders' },
      'Profile': { setup: (t) => t.run(() => t.ref.navigate('MainTabs', { screen: 'ProfileTab' })), from: (t) => t.navs.ProfileMain, expect: 'MainTabs > ProfileTab > ProfileMain' },
    };
    for (const [label, c] of Object.entries(cases)) {
      await withApp(async (t) => {
        await c.setup(t);
        await t.run(() => nav.requestOrderStart(c.from(t), { kind: 'new' }, freshGuard()));
        await t.run(() => t.navs.NewOrderMain.goBack());
        assert.equal(focusedPath(t.state()), c.expect, label);
        assert.equal(count(t.state(), 'NewOrderTab'), 0, `${label}: no New Order left behind`);
      });
    }
  });

  it('starting a new order AFTER successfully submitting one: one flow, one tab bar, no stale Review/Success', async () => {
    for (const exit of [
      { label: 'Success → My Orders', go: (t) => t.navs.OrderSuccess.navigate('MainTabs', { screen: 'OrdersTab', params: { screen: 'MyOrders' } }), from: (t) => t.navs.MyOrders },
      { label: 'Success → Home', go: (t) => t.navs.OrderSuccess.navigate('MainTabs', { screen: 'HomeTab' }), from: (t) => t.navs.HomeMain },
    ]) {
      await withApp(async (t) => {
        await t.run(() => nav.requestOrderStart(t.navs.HomeMain, { kind: 'new' }, freshGuard()));
        await t.run(() => t.navs.NewOrderMain.navigate('OrderReview', { finalItems: [{}] }));
        await t.run(() => t.navs.OrderReview.navigate('OrderSuccess', { orderData: { id: 'o-9' } }));
        await t.run(() => exit.go(t));
        await t.run(() => nav.requestOrderStart(exit.from(t), { kind: 'new' }, freshGuard()));
        expectSingleFlow(t, 'create');
        assert.deepEqual(flowStack(t.state()), ['NewOrderMain'], `${exit.label}: Review/Success are not reused`);
      });
    }
  });

  describe('Order Success exit (SL-ORDER-REPEAT-ORDER-03)', () => {
    const rootNames = (t) => t.state().routes.map((r) => r.name);
    const reachSuccess = async (t, from = 'Home') => {
      if (from === 'Orders') await goOrders(t);
      await t.run(() => nav.requestOrderStart(from === 'Orders' ? t.navs.MyOrders : t.navs.HomeMain, { kind: 'new' }, freshGuard()));
      await t.run(() => t.navs.NewOrderMain.navigate('OrderReview', { finalItems: [{}] }));
      await t.run(() => t.navs.OrderReview.navigate('OrderSuccess', { orderData: { id: 'o-9' } }));
      assert.equal(focusedPath(t.state()), 'NewOrderTab > OrderSuccess');
    };
    const noStale = (t, checkErrors = true) => {
      assert.deepEqual(rootNames(t), ['MainTabs'], 'the finished flow and any duplicate MainTabs are gone');
      for (const n of ['NewOrderTab', 'NewOrderMain', 'OrderReview', 'OrderSuccess']) assert.equal(count(t.state(), n), 0, `${n} is not left in the stack`);
      assert.equal(count(t.state(), 'MainTabs'), 1);
      if (checkErrors) assert.equal(t.errors.filter((e) => /couldn't be applied|not handled/i.test(e)).length, 0);
    };
    const exits = [
      ['My Orders', nav_ => nav_.SUCCESS_EXITS.ORDERS, null, 'MainTabs > OrdersTab > MyOrders'],
      ['Home', nav_ => nav_.SUCCESS_EXITS.HOME, null, 'MainTabs > HomeTab > HomeMain'],
      ['order detail', nav_ => nav_.SUCCESS_EXITS.DETAIL, 'o-9', 'MainTabs > OrdersTab > OrderDetail'],
    ];

    it('ROOT CAUSE: the old plain navigate left a second MainTabs on top of the finished flow (Back returned to Review/Success)', async () => {
      await withApp(async (t) => {
        await reachSuccess(t);
        await t.run(() => t.navs.OrderSuccess.navigate('MainTabs', { screen: 'OrdersTab', params: { screen: 'MyOrders' } }));
        assert.deepEqual(rootNames(t), ['MainTabs', 'NewOrderTab', 'MainTabs'], 'obsolete flow still in the stack');
        for (let i = 0; i < 3 && !focusedPath(t.state()).startsWith('NewOrderTab'); i += 1) await t.run(() => t.ref.goBack());
        assert.equal(focusedPath(t.state()), 'NewOrderTab > OrderSuccess', 'Back presses landed on the stale flow');
      });
    });

    for (const from of ['Home', 'Orders']) {
      for (const [label, pick, orderId, expectPath] of exits) {
        it(`exit to ${label} (flow started from ${from}): no stale flow, Back never reaches Review/Success`, async () => {
          await withApp(async (t) => {
            await reachSuccess(t, from);
            await t.run(() => nav.leaveOrderSuccess(t.navs.OrderSuccess, pick(nav), orderId));
            assert.equal(focusedPath(t.state()), expectPath);
            noStale(t);
            // hardware / gesture Back from the destination can only move within MainTabs, never into the old flow
            // (at the app root a further Back has nowhere to go — the app closes — which the router reports as "not handled")
            for (let i = 0; i < 3; i += 1) { await t.run(() => t.ref.goBack()); noStale(t, false); }
          });
        });
      }
    }

    it('hardware Back and gesture Back are the same event: the Success screen handles it with the same exit', async () => {
      await withApp(async (t) => {
        await reachSuccess(t);
        const onBack = () => { nav.leaveOrderSuccess(t.navs.OrderSuccess); return true; };
        assert.equal(await t.run(async () => onBack()), true, 'the handler consumes the event (no default pop to Review)');
        assert.equal(focusedPath(t.state()), 'MainTabs > OrdersTab > MyOrders');
        noStale(t);
      });
    });

    it('a second exit tap (double tap) changes nothing', async () => {
      await withApp(async (t) => {
        await reachSuccess(t);
        await t.run(async () => { nav.leaveOrderSuccess(t.navs.OrderSuccess); nav.leaveOrderSuccess(t.navs.OrderSuccess); });
        assert.equal(focusedPath(t.state()), 'MainTabs > OrdersTab > MyOrders');
        noStale(t);
      });
    });

    it('a new order can be started right after the exit: one flow, nothing stale', async () => {
      await withApp(async (t) => {
        await reachSuccess(t);
        await t.run(() => nav.leaveOrderSuccess(t.navs.OrderSuccess));
        await t.run(() => nav.requestOrderStart(t.navs.MyOrders, { kind: 'new' }, freshGuard()));
        expectSingleFlow(t, 'create');
        assert.deepEqual(flowStack(t.state()), ['NewOrderMain']);
      });
    });
  });

  it('an order started twice in a row after Back leaves no leftovers', async () => {
    await withApp(async (t) => {
      for (let i = 0; i < 3; i += 1) {
        await t.run(() => nav.requestOrderStart(t.navs.HomeMain, { kind: 'new' }, freshGuard()));
        expectSingleFlow(t, 'create');
        await t.run(() => t.navs.NewOrderMain.goBack());
        assert.equal(focusedPath(t.state()), 'MainTabs > HomeTab > HomeMain');
      }
    });
  });

  describe('unfinished draft (customer left the flow without placing it, e.g. via a notification)', () => {
    const leaveWithDraft = async (t) => {
      await t.run(() => nav.requestOrderStart(t.navs.HomeMain, { kind: 'new' }, freshGuard()));
      const ts = focusedRoute(t.state()).params.ts;
      await t.run(() => t.navs.NewOrderMain.navigate('OrderReview', { finalItems: [{}] }));
      await t.run(() => t.ref.navigate('MainTabs', { screen: 'HomeTab', params: { screen: 'BusinessUpdateDetail', params: { updateId: 'u1' } } }));
      assert.equal(focusedPath(t.state()), 'MainTabs > HomeTab > BusinessUpdateDetail');
      return ts;
    };
    const press = (t, choice) => t.run(() => nav.requestOrderStart(t.navs.BusinessUpdateDetail, { kind: 'new' }, { ...freshGuard(), hasDraft: true, askDraft: async () => choice }));

    it('CONTINUE returns to the unfinished order exactly where it was (same session, same screen)', async () => {
      await withApp(async (t) => {
        const ts = await leaveWithDraft(t);
        assert.equal(await press(t, 'continue'), 'resumed');
        assert.equal(focusedPath(t.state()), 'NewOrderTab > OrderReview');
        assert.equal(nav.findOrderFlowRoute(t.state()).params.params.ts, ts, 'session untouched → NewOrderScreen keeps the cart');
        assert.equal(count(t.state(), 'NewOrderTab'), 1);
      });
    });

    it('START NEW replaces it with a fresh session on a single flow', async () => {
      await withApp(async (t) => {
        const ts = await leaveWithDraft(t);
        assert.equal(await press(t, 'new'), 'started');
        expectSingleFlow(t, 'create');
        assert.ok(focusedRoute(t.state()).params.ts > ts);
        assert.deepEqual(flowStack(t.state()), ['NewOrderMain']);
      });
    });

    it('CANCEL changes nothing', async () => {
      await withApp(async (t) => {
        await leaveWithDraft(t);
        const stateBefore = JSON.stringify(t.state());
        assert.equal(await press(t, 'cancel'), 'cancelled');
        assert.equal(JSON.stringify(t.state()), stateBefore);
      });
    });
  });
});
