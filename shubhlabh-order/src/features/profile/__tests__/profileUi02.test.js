// SL-ORDER-PROFILE-UI-02 — simplified Profile + the customer's REAL assigned salesperson.
// Real salespersonAssignment.js against an in-memory crm_parties/app_users fake with per-customer rows; static
// checks on the Profile screen source (layout order, single Updates entry, every existing action kept).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '../../../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const load = () => import(pathToFileURL(path.join(root, 'src/features/profile/salespersonAssignment.js')).href);

// crm_parties rows (each customer has their own assignment); the fake only ever answers `.eq('id', x).single()`.
const PARTIES = {
  'party-A': { id: 'party-A', assigned_owner_id: 'u1', owner_name: 'Manoj Kumar', territory_name: 'Indore', owner: { id: 'u1', display_name: 'Manoj Kumar', role: 'Staff', mobile: '+91 98285 39054', whatsapp: null, email: 'm@x.in', password_hash: 'SECRET', internal_notes: 'private' } },
  'party-B': { id: 'party-B', assigned_owner_id: 'u2', owner_name: 'Rajesh Sharma', territory_name: null, owner: { id: 'u2', display_name: 'Rajesh Sharma', role: null, mobile: null, whatsapp: null, email: null } },
  'party-C': { id: 'party-C', assigned_owner_id: null, owner_name: null, territory_name: null, owner: null },
  'party-D': { id: 'party-D', assigned_owner_id: 'u9', owner_name: 'Fallback Name', territory_name: null, owner: null }, // FK embed hidden by RLS
  'party-E': { id: 'party-E', assigned_owner_id: 'u5', owner_name: null, territory_name: null, owner: { id: 'u5', display_name: 'Short Phone', mobile: '12345', whatsapp: '98765 43210' } },
};
const makeClient = () => {
  const log = [];
  return {
    log,
    from(table) {
      const q = { table, filters: [], select: null, single: false };
      const api = {
        select(cols) { q.select = cols; return api; },
        eq(c, v) { q.filters.push([c, v]); return api; },
        single() { q.single = true; log.push({ table, filters: q.filters.slice(), select: q.select }); const id = (q.filters.find(([c]) => c === 'id') || [])[1]; return Promise.resolve(PARTIES[id] ? { data: PARTIES[id], error: null } : { data: null, error: { message: 'no rows' } }); },
      };
      return api;
    },
  };
};

describe('Assigned salesperson (real assignment, customer-specific)', () => {
  it('customer WITH an assigned salesperson: shows that person (from the DB row, nothing hardcoded)', async () => {
    const m = await load();
    const c = makeClient();
    const { salesperson, error } = await m.fetchAssignedSalesperson(c, 'party-A', 'Field Sales Representative');
    assert.equal(error, null);
    assert.equal(salesperson.display_name, 'Manoj Kumar');
    assert.equal(salesperson.mobile, '+91 98285 39054');
    assert.equal(salesperson.territory, 'Indore');
  });

  it('customer WITHOUT one: null → the card shows "No salesperson assigned yet."', async () => {
    const m = await load();
    const { salesperson, error } = await m.fetchAssignedSalesperson(makeClient(), 'party-C');
    assert.deepEqual([salesperson, error], [null, null]);
    assert.match(read('src/shared/localization/en.js'), /'profile\.noSalesperson': 'No salesperson assigned yet\.'/);
    assert.match(read('src/features/profile/SalespersonCard.js'), /t\('profile\.noSalesperson'\)/);
    assert.deepEqual(await m.fetchAssignedSalesperson(makeClient(), null), { salesperson: null, error: null }, 'no customer id: no query at all');
  });

  it('isolation: each customer sees only their own assignment, and the query is bound to their own party id', async () => {
    const m = await load();
    const c = makeClient();
    const a = (await m.fetchAssignedSalesperson(c, 'party-A')).salesperson;
    const b = (await m.fetchAssignedSalesperson(c, 'party-B')).salesperson;
    assert.deepEqual([a.display_name, b.display_name], ['Manoj Kumar', 'Rajesh Sharma']);
    assert.ok(c.log.every((l) => l.table === 'crm_parties' && l.filters.length === 1 && l.filters[0][0] === 'id'), 'one row, by id — never a list of salespeople');
    assert.deepEqual(c.log.map((l) => l.filters[0][1]), ['party-A', 'party-B']);
    assert.ok(!c.log.some((l) => /app_users\s*\?\s*$/.test(l.table)), 'app_users is never queried directly');
    const card = read('src/features/profile/SalespersonCard.js');
    assert.match(card, /customerProfile\?\.id/);
    assert.match(card, /fetchAssignedSalesperson\(supabase, partyId,/);
  });

  it('falls back to the denormalised owner name when the salesperson record is not readable; then there is no contact info', async () => {
    const m = await load();
    const { salesperson } = await m.fetchAssignedSalesperson(makeClient(), 'party-D');
    assert.equal(salesperson.display_name, 'Fallback Name');
    assert.deepEqual(m.contactActions(salesperson), { call: false, whatsapp: false });
  });

  it('Call / WhatsApp only for valid numbers', async () => {
    const m = await load();
    const get = async (id) => (await m.fetchAssignedSalesperson(makeClient(), id)).salesperson;
    assert.deepEqual(m.contactActions(await get('party-A')), { call: true, whatsapp: true }, 'WhatsApp falls back to the mobile');
    assert.deepEqual(m.contactActions(await get('party-B')), { call: false, whatsapp: false }, 'name but no number');
    assert.deepEqual(m.contactActions(await get('party-E')), { call: false, whatsapp: true }, 'invalid mobile, valid WhatsApp');
    assert.deepEqual(m.contactActions(null), { call: false, whatsapp: false });
    for (const bad of [null, undefined, '', '   ', 'abc', '12345', 98285, '+91 98']) assert.equal(m.isValidPhone(bad), false, String(bad));
    for (const good of ['9828539054', '+91 98285 39054', '098285-39054']) assert.equal(m.isValidPhone(good), true, good);
    assert.equal(m.telUrl('+91 98285 39054'), 'tel:+919828539054');
    assert.equal(m.telUrl('123'), null);
    assert.ok(m.whatsappUrl('+91 98285 39054', 'Manoj').startsWith('https://wa.me/919828539054?text='));
    assert.equal(m.whatsappUrl(null), null);
  });

  it('privacy: only display fields are returned (no hash / notes), and the card never prints the phone number', async () => {
    const m = await load();
    const sp = (await m.fetchAssignedSalesperson(makeClient(), 'party-A')).salesperson;
    assert.deepEqual(Object.keys(sp).sort(), ['display_name', 'id', 'mobile', 'role', 'territory', 'whatsapp']);
    const card = read('src/features/profile/SalespersonCard.js');
    assert.doesNotMatch(card, /\{salesperson\.(mobile|whatsapp)\}/);
    assert.doesNotMatch(card, /\b\d{10}\b/, 'no hardcoded numbers or names');
  });

  it('uses the same relationship and query shape as the existing My Salesperson screen (assignment logic unchanged)', () => {
    const screen = read('src/features/profile/MySalespersonScreen.js');
    const mod = read('src/features/profile/salespersonAssignment.js');
    for (const frag of ["from('crm_parties')", 'assigned_owner_id', 'owner_name', 'territory_name', 'app_users!crm_parties_assigned_owner_id_fkey', ".eq('id', "]) {
      assert.ok(screen.includes(frag) && mod.includes(frag), frag);
    }
    assert.match(screen, /navigation\.navigate|SLHeader/); // existing screen still intact
  });
});

describe('Profile screen layout and actions', () => {
  const src = read('src/features/profile/ProfileScreen.js');
  const at = (frag) => { const i = src.indexOf(frag); assert.ok(i >= 0, `missing: ${frag}`); return i; };

  it('sections appear in the required order', () => {
    const order = ['styles.identityCard', 'styles.bannerContainer', 'styles.shortcutRow', '<SalespersonCard', "screen: 'MyOrders'", "navigate('MyRewardSchemes')", "t('profile.updates')", "navigate('ComplaintCenter')", "t('profile.accountSection')", "onValueChange={toggleLanguage}", "navigate('Settings')", "navigate('ChangePassword')"].map(at);
    assert.deepEqual(order, [...order].sort((x, y) => x - y));
    const shortcut = src.slice(at('styles.shortcutRow'), at('<SalespersonCard'));
    assert.ok(shortcut.indexOf("navigateToEditor(null)") < shortcut.indexOf("navigate('DeliveryAddress')") && shortcut.indexOf("navigate('DeliveryAddress')") < shortcut.indexOf("navigateToEditor('gst')"));
  });

  it('ONE Updates entry: the two separate update shortcuts are gone and the existing inbox opens', () => {
    assert.equal((src.match(/NotificationInbox/g) || []).length, 1);
    assert.match(src, /navigate\('NotificationInbox', \{ initialFilter: 'ALL' \}\)/);
    assert.doesNotMatch(src, /initialFilter: 'BUSINESS'|initialFilter: 'SHUBH_LABH'|Business Updates|Shubh Labh Updates|व्यावसायिक अपडेट/);
    const inbox = read('src/features/notifications/NotificationInboxScreen.js');
    assert.match(inbox, /id: 'ALL'/); assert.match(inbox, /id: 'BUSINESS'/); assert.match(inbox, /id: 'SHUBH_LABH'/); // the existing filters (audience / visibility logic) are untouched there
    assert.match(read('src/navigation/ProfileStackNavigator.js'), /name="NotificationInbox"/);
  });

  it('every existing Profile action is still wired (routes unchanged)', () => {
    for (const frag of ["navigateToEditor(null)", "navigateToEditor('gst')", "navigateToEditor(bannerTargetSection)", "navigate('DeliveryAddress')", "navigate('OrdersTab', { screen: 'MyOrders' })", "navigate('MyRewardSchemes')", "navigate('ComplaintCenter')", "navigate('Settings')", "navigate('ChangePassword')", "navigate('MySalesperson')", 'onPress={logout}', 'onValueChange={toggleLanguage}', "navigation.navigate('BusinessProfile', { initialSection: section })"]) at(frag);
    const stack = read('src/navigation/ProfileStackNavigator.js');
    for (const name of ['DeliveryAddress', 'MyRewardSchemes', 'ComplaintCenter', 'Settings', 'ChangePassword', 'MySalesperson', 'BusinessProfile']) assert.match(stack, new RegExp(`name="${name}"`), name);
  });

  it('the screen still scrolls inside the safe area under the persistent bottom tabs', () => {
    assert.match(src, /<SafeAreaView style=\{styles\.safeArea\}>/);
    assert.match(src, /<ScrollView contentContainerStyle=\{styles\.content\}>/);
    assert.match(read('src/navigation/MainTabNavigator.js'), /ProfileTab/);
    assert.match(src, /<View style=\{\{ height: 40 \}\} \/>/, 'bottom padding keeps the last item clear of the tab bar');
    // three shortcut cards share the width equally, so small screens wrap text, not overflow
    assert.match(src, /shortcut: \{\s*flex: 1,/);
  });

  it('English and Hindi: every new key exists in both languages', () => {
    const en = read('src/shared/localization/en.js'); const hi = read('src/shared/localization/hi.js');
    for (const k of ['profile.updates', 'profile.updatesSub', 'profile.ordersSub', 'profile.rewardsSub', 'profile.supportSub', 'profile.noSalesperson', 'profile.salespersonCardLoading', 'profile.callSalesperson', 'profile.whatsappSalesperson']) {
      assert.match(en, new RegExp(`'${k.replace('.', '\\.')}': '`), `en ${k}`);
      const h = hi.match(new RegExp(`'${k.replace('.', '\\.')}': '([^']+)'`));
      assert.ok(h && /[ऀ-ॿ]/.test(h[1]), `hi ${k}`);
    }
    for (const frag of ["t('profile.ordersSub')", "t('profile.rewardsSub')", "t('profile.supportSub')", "t('profile.updatesSub')"]) at(frag);
  });
});
