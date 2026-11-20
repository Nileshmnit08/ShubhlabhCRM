// SL-NAVIGATION-INITIAL-ROUTE-FIX-01 + SL-ONBOARDING-SKIP-01
// Reported error: "Couldn't find a screen named 'MainTabs' to use as 'initialRouteName'."
// Root cause (App.js:67 in commit 31c3687): the signed-in Stack.Navigator always declared initialRouteName="MainTabs",
// but MainTabs was registered only when the customer counted as onboarded; otherwise the navigator contained only
// "Onboarding". SL-ONBOARDING-SKIP-01 removes the onboarding gate: MainTabs is now registered unconditionally.
// Static checks read the real source; the router checks run the REAL React Navigation StackRouter / TabRouter
// (needs react-test-renderer — see orderFlowRealRouter.test.js — otherwise visibly skipped).
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../..');
const read = (r) => fs.readFileSync(path.join(root, r), 'utf8');
const walk = (dir, out = []) => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) { if (e.name !== '__tests__') walk(p, out); } else if (/\.js$/.test(e.name)) out.push(p); } return out; };

describe('every initialRouteName names a screen registered in the same navigator', () => {
  it('navigator files with a literal initialRouteName register that screen', () => {
    let checked = 0;
    for (const f of ['App.js', ...walk('src')]) {
      const src = read(f);
      for (const m of src.matchAll(/initialRouteName="([^"]+)"/g)) {
        checked += 1;
        assert.match(src, new RegExp(`<\\w+\\.Screen\\s+name="${m[1]}"`), `${f}: initialRouteName "${m[1]}" has no registered screen`);
      }
    }
    assert.ok(checked >= 3, 'App, Home stack, Profile stack and the tabs were checked');
  });

  it('App.js: MainTabs is registered UNCONDITIONALLY in the signed-in navigator, which starts there', () => {
    const src = read('App.js');
    const signedIn = src.slice(src.indexOf('<Stack.Navigator initialRouteName="MainTabs"'), src.indexOf('</Stack.Navigator>', src.indexOf('<Stack.Navigator initialRouteName="MainTabs"')));
    assert.ok(signedIn.length > 0);
    assert.match(signedIn, /<Stack\.Screen name="MainTabs" component=\{MainTabNavigator\} \/>/);
    assert.match(signedIn, /name="NewOrderTab"/); assert.match(signedIn, /name="NewOrderStack"/);
    assert.doesNotMatch(signedIn, /\?|&&|isOnboarded/, 'no condition around the registered screens');
    assert.equal((src.match(/name="MainTabs"/g) || []).length, 1, 'registered once, no placeholder screen added');
    assert.match(src, /<Stack\.Navigator screenOptions=\{\{ headerShown: false \}\}>\s*\n\s*<Stack\.Screen name="Login"/, 'signed-out navigator: only Login');
  });

  it('no onboarding gate: login never depends on onboarding_completed / is_onboarded', () => {
    for (const f of ['App.js', 'src/features/auth/AuthContext.js', 'src/features/auth/LoginScreen.js', 'src/navigation/MainTabNavigator.js']) {
      const src = read(f);
      assert.doesNotMatch(src, /onboarding_completed|is_onboarded|isOnboarded|OnboardingNavigator|name="Onboarding"/, f);
    }
    // the onboarding screens are kept (reusable), they are just not part of the login journey
    assert.ok(fs.existsSync(path.join(root, 'src/features/onboarding/OnboardingNavigator.js')));
  });

  it('the error boundary and crash logging are still in place', () => {
    assert.match(read('App.js'), /<ErrorBoundary>/);
    assert.match(read('index.js'), /installGlobalErrorRecorder/);
  });

  it('screens the app navigates to by name still exist (OrderSuccess, OrderDetail, Repeat/New Order, tabs, Edit Profile)', () => {
    const flow = read('src/navigation/NewOrderStackNavigator.js');
    for (const n of ['NewOrderMain', 'OrderReview', 'OrderSuccess']) assert.match(flow, new RegExp(`name="${n}"`));
    assert.match(read('src/navigation/OrdersStackNavigator.js'), /name="OrderDetail"/);
    assert.match(read('src/navigation/ProfileStackNavigator.js'), /name="BusinessProfile"/);
    const tabs = read('src/navigation/MainTabNavigator.js');
    for (const n of ['HomeTab', 'ProductsTab', 'OrdersTab', 'ProfileTab']) assert.match(tabs, new RegExp(`name="${n}"`));
  });
});

let TestRenderer = null;
try { TestRenderer = require('react-test-renderer'); } catch (e) { /* optional */ }
const skip = TestRenderer ? false : 'react-test-renderer is not installed (see orderFlowRealRouter.test.js)';

describe('real routers: signed-in navigator and the Dashboard → Edit Profile hop', { skip }, () => {
  let React; let core; let routers;
  before(() => { React = require('react'); core = require('@react-navigation/core'); routers = require('@react-navigation/routers'); globalThis.IS_REACT_ACT_ENVIRONMENT = true; });

  const makeNav = (Router) => {
    const h = React.createElement;
    function Nav({ initialRouteName, children, backBehavior }) {
      const { state, descriptors, NavigationContent } = core.useNavigationBuilder(Router, { initialRouteName, children, backBehavior });
      return h(NavigationContent, null, state.routes.map((r) => h(React.Fragment, { key: r.key }, descriptors[r.key].render())));
    }
    return core.createNavigatorFactory(Nav)();
  };

  // Mirrors App.js: root Stack (initial MainTabs, registered always) → tabs → per-tab stacks.
  function mount(initialRoute = 'MainTabs') {
    const h = React.createElement;
    const Stack = makeNav(routers.StackRouter); const Tabs = makeNav(routers.TabRouter);
    const navs = {}; const screen = (n) => function S({ navigation }) { navs[n] = navigation; return null; };
    const stackOf = (names) => function StackOf() { return h(Stack.Navigator, null, names.map((n) => h(Stack.Screen, { key: n, name: n, component: screen(n) }))); };
    const Home = stackOf(['HomeMain', 'NotificationInbox']); const Profile = stackOf(['ProfileMain', 'BusinessProfile', 'DeliveryAddress']);
    const Orders = stackOf(['MyOrders', 'OrderDetail']); const Products = stackOf(['MarketPrices']);
    function MainTabs() { return h(Tabs.Navigator, { initialRouteName: 'HomeTab', backBehavior: 'initialRoute' }, h(Tabs.Screen, { name: 'HomeTab', component: Home }), h(Tabs.Screen, { name: 'ProductsTab', component: Products }), h(Tabs.Screen, { name: 'OrdersTab', component: Orders }), h(Tabs.Screen, { name: 'ProfileTab', component: Profile })); }
    const Flow = stackOf(['NewOrderMain', 'OrderReview', 'OrderSuccess']);
    function Root() { return h(Stack.Navigator, { initialRouteName: initialRoute }, h(Stack.Screen, { name: 'MainTabs', component: MainTabs }), h(Stack.Screen, { name: 'NewOrderTab', component: Flow }), h(Stack.Screen, { name: 'NewOrderStack', component: Flow })); }
    const ref = core.createNavigationContainerRef(); let r;
    const origErr = console.error; const errors = []; console.error = (...a) => errors.push(a.join(' '));
    try { TestRenderer.act(() => { r = TestRenderer.create(h(core.BaseNavigationContainer, { ref }, h(Root))); }); } finally { console.error = origErr; }
    return { ref, navs, errors, run: (fn) => React.act(async () => { await fn(); }), done: () => TestRenderer.act(() => r.unmount()) };
  }
  const path_ = (state) => { const out = []; let s = state; while (s) { const r = s.routes[s.index]; out.push(r.name); s = r.state; } return out.join(' > '); };

  it('REPRODUCTION: the old registration (MainTabs only after onboarding) fails with the reported error', () => {
    const h = React.createElement; const Stack = makeNav(routers.StackRouter);
    const OldRoot = () => h(Stack.Navigator, { initialRouteName: 'MainTabs' }, h(Stack.Screen, { name: 'Onboarding', component: () => null }));
    const origErr = console.error; console.error = () => {};
    try { assert.throws(() => TestRenderer.act(() => { TestRenderer.create(h(core.BaseNavigationContainer, null, h(OldRoot))); }), /Couldn't find a screen named 'MainTabs' to use as 'initialRouteName'/); } finally { console.error = origErr; }
  });

  it('the app structure opens on the Dashboard (Home tab) with no navigation error', () => {
    const app = mount();
    assert.equal(path_(app.ref.getRootState()), 'MainTabs > HomeTab > HomeMain');
    assert.equal(app.errors.filter((e) => /initialRouteName|Couldn't find/.test(e)).length, 0);
    app.done();
  });

  it('all four tabs can be opened and the Dashboard is the way back', async () => {
    const app = mount();
    for (const [tab, first] of [['ProductsTab', 'MarketPrices'], ['OrdersTab', 'MyOrders'], ['ProfileTab', 'ProfileMain'], ['HomeTab', 'HomeMain']]) {
      await app.run(() => app.ref.navigate('MainTabs', { screen: tab }));
      assert.equal(path_(app.ref.getRootState()), `MainTabs > ${tab} > ${first}`);
    }
    app.done();
  });

  it('Dashboard "Update Profile" opens Edit Profile (BusinessProfile) with the section, and Back returns to the Profile tab', async () => {
    const app = mount();
    await app.run(() => app.navs.HomeMain.navigate('ProfileTab', { screen: 'BusinessProfile', params: { initialSection: 'address' } }));
    assert.equal(path_(app.ref.getRootState()), 'MainTabs > ProfileTab > BusinessProfile');
    const s = app.ref.getRootState().routes[0].state; const profileStack = s.routes.find((r) => r.name === 'ProfileTab').state;
    assert.equal(profileStack.routes[profileStack.index].params.initialSection, 'address');
    await app.run(() => app.navs.BusinessProfile.goBack());
    assert.equal(path_(app.ref.getRootState()), 'MainTabs > ProfileTab > ProfileMain');
    app.done();
  });

  it('order flow, OrderDetail and OrderSuccess exits still resolve on the same structure', async () => {
    const app = mount();
    await app.run(() => app.navs.HomeMain.navigate('NewOrderTab', { screen: 'NewOrderMain', params: { mode: 'create', ts: 1 }, pop: true }, { pop: true }));
    assert.equal(path_(app.ref.getRootState()), 'NewOrderTab > NewOrderMain');
    await app.run(() => app.navs.NewOrderMain.navigate('OrderReview', {}));
    await app.run(() => app.navs.OrderReview.navigate('OrderSuccess', { orderData: { id: 'o1' } }));
    await app.run(() => app.navs.OrderSuccess.navigate('MainTabs', { screen: 'OrdersTab', params: { screen: 'OrderDetail', params: { orderId: 'o1' }, pop: true }, pop: true }, { pop: true }));
    assert.equal(path_(app.ref.getRootState()), 'MainTabs > OrdersTab > OrderDetail');
    assert.equal(app.ref.getRootState().routes.length, 1, 'finished order flow removed from the stack');
    app.done();
  });
});
