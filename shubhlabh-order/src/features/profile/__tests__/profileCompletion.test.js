// SL-ONBOARDING-SKIP-01 — optional profile-completion reminder (informational only).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '../../../..');
const read = (r) => fs.readFileSync(path.join(root, r), 'utf8');
const load = () => import(pathToFileURL(path.join(root, 'src/features/profile/profileCompletion.js')).href);

const FULL = { id: 'p1', display_name: 'Khejroli Traders', legal_or_core_name: 'R. Yadav', mobile: '9828539054', city: 'Jaipur', state: 'Rajasthan', gst_number: '' };
const memory = () => { const d = {}; return { d, getItem: async (k) => (k in d ? d[k] : null), setItem: async (k, v) => { d[k] = v; }, removeItem: async (k) => { delete d[k]; } }; };

describe('profile completion rule (same five core fields as the Profile screen)', () => {
  it('complete / incomplete / missing fields / percent', async () => {
    const m = await load();
    assert.deepEqual([m.getProfileCompletion(FULL, null).isComplete, m.getProfileCompletion(FULL, null).percent], [true, 100]);
    const c = m.getProfileCompletion({ ...FULL, city: '  ', state: null }, null);
    assert.deepEqual([c.isComplete, c.percent, c.missing], [false, 60, ['city', 'state']]);
    assert.equal(m.editProfileSection(c), 'address', 'opens the address section when city / state are missing');
    assert.equal(m.editProfileSection(m.getProfileCompletion({ ...FULL, display_name: '' }, null)), null);
    // owner and mobile may come from the app user when the CRM party lacks them
    assert.equal(m.getProfileCompletion({ ...FULL, legal_or_core_name: '', mobile: '' }, { display_name: 'Owner', mobile: '9999999999' }).isComplete, true);
    assert.equal(m.getProfileCompletion(null, null).percent, 0);
    assert.equal(m.getProfileCompletion(FULL, null).hasGst, false, 'GST is optional and does not count');
  });

  it('the Profile screen uses the same helper (one source of truth)', () => {
    const p = read('src/features/profile/ProfileScreen.js');
    assert.match(p, /import \{ getProfileCompletion \} from '\.\/profileCompletion\.js';/);
    assert.match(p, /const completion = getProfileCompletion\(customerProfile, userProfile\);/);
  });
});

describe('reminder visibility', () => {
  it('shown for a loaded incomplete profile; hidden when complete; hidden while loading; never needs onboarding', async () => {
    const m = await load();
    const inc = { ...FULL, city: '' };
    assert.equal(m.shouldShowCompletionCard({ customerProfile: inc, userProfile: null }), true);
    assert.equal(m.shouldShowCompletionCard({ customerProfile: FULL, userProfile: null }), false, 'completing the profile hides it automatically');
    assert.equal(m.shouldShowCompletionCard({ customerProfile: null, userProfile: null }), false, 'no flash while the profile loads');
    assert.equal(m.shouldShowCompletionCard({ customerProfile: {}, userProfile: null }), false);
  });

  it('dismiss hides it for 7 days, then it may return; completing always hides it; per-customer storage', async () => {
    const m = await load();
    const inc = { ...FULL, city: '' };
    const t0 = 1_800_000_000_000;
    assert.equal(m.shouldShowCompletionCard({ customerProfile: inc, userProfile: null, dismissedAt: t0, now: t0 + 1000 }), false);
    assert.equal(m.shouldShowCompletionCard({ customerProfile: inc, userProfile: null, dismissedAt: t0, now: t0 + m.DISMISS_SNOOZE_MS - 1 }), false);
    assert.equal(m.shouldShowCompletionCard({ customerProfile: inc, userProfile: null, dismissedAt: t0, now: t0 + m.DISMISS_SNOOZE_MS + 1 }), true);
    assert.equal(m.shouldShowCompletionCard({ customerProfile: FULL, userProfile: null, dismissedAt: null }), false);
    const s = memory();
    assert.equal(await m.saveDismissedAt(s, 'party-A', t0), true);
    assert.equal(await m.readDismissedAt(s, 'party-A'), t0);
    assert.equal(await m.readDismissedAt(s, 'party-B'), null, 'another customer on the same phone still sees their own reminder');
    assert.notEqual(m.dismissKey('party-A'), m.dismissKey('party-B'));
    const broken = { getItem: async () => { throw new Error('x'); }, setItem: async () => { throw new Error('x'); } };
    assert.equal(await m.readDismissedAt(broken, 'p'), null);
    assert.equal(await m.saveDismissedAt(broken, 'p'), false, 'storage failure never throws');
  });
});

describe('Dashboard wiring and the optional (non-blocking) nature', () => {
  it('card is on the Dashboard, opens Edit Profile (BusinessProfile) through the Profile tab, and has a dismiss button', () => {
    const home = read('src/features/home/HomeScreen.js');
    assert.match(home, /<ProfileCompletionCard\s*\n\s*onUpdate=\{\(section\) => navigation\.navigate\('ProfileTab', \{ screen: 'BusinessProfile', params: \{ initialSection: section \} \}\)\}/);
    const card = read('src/features/profile/ProfileCompletionCard.js');
    assert.match(card, /t\('profileCard\.message'\)/); assert.match(card, /t\('profileCard\.cta'\)/);
    assert.match(card, /onPress=\{dismiss\}/);
    assert.doesNotMatch(card, /Modal|Alert|StyleSheet\.absoluteFill|position: 'absolute'/, 'not a popup / overlay');
    assert.match(card, /if \(loadedFor !== partyId\) return null;/);
  });

  it('Edit Profile saves through the existing mechanism and cannot change CRM-controlled identity', () => {
    const bp = read('src/features/profile/BusinessProfileScreen.js');
    const payload = bp.slice(bp.indexOf('const partyPayload = {'), bp.indexOf('};', bp.indexOf('const partyPayload = {')));
    for (const key of ['display_name', 'legal_or_core_name', 'customer_type', 'mobile', 'whatsapp', 'email', 'city', 'state', 'gst_number', 'business_context']) assert.ok(payload.includes(key), key);
    for (const forbidden of ['assigned_owner', 'owner_name', 'role', 'is_active', 'crm_party_id', 'territory', 'crm_status', 'id:']) assert.ok(!payload.includes(forbidden), `payload must not write ${forbidden}`);
    assert.match(bp, /\.update\(partyPayload\)\s*\n\s*\.eq\('id', targetPartyId\)/, 'only the customer\'s own party row');
    assert.match(bp, /await refreshBuyerData\(\)/, 'the Dashboard re-reads the profile after saving, so the card disappears');
  });

  it('nothing in the order path depends on profile completeness', () => {
    for (const f of ['src/features/orders/NewOrderScreen.js', 'src/features/orders/OrderReviewScreen.js', 'src/features/orders/orderSubmission.js', 'src/features/products/useProducts.js']) {
      assert.doesNotMatch(read(f), /getProfileCompletion|isComplete|profileCompletion|onboarding/i, f);
    }
    // submission needs only the customer's id (existing rule), not any optional profile field
    const sub = read('src/features/orders/orderSubmission.js');
    assert.match(sub, /if \(!customerProfile\?\.id\) throw new SubmitError\('PROFILE_MISSING'/);
    assert.match(sub, /currentSavedAddress = \(session, customerProfile\) =>\s*\n\s*session\?\.user\?\.user_metadata\?\.deliveryAddress\?\.address \|\| customerProfile\?\.city \|\| 'Saved Address'/, 'a missing delivery address / city falls back instead of blocking');
  });

  it('English and Hindi text exist', () => {
    const en = read('src/shared/localization/en.js'); const hi = read('src/shared/localization/hi.js');
    assert.match(en, /'profileCard\.message': 'Complete your business profile for a better experience\.'/);
    assert.match(en, /'profileCard\.cta': 'Update Profile'/);
    assert.match(hi, /'profileCard\.message': 'बेहतर अनुभव के लिए अपनी बिज़नेस प्रोफाइल पूरी करें।'/);
    assert.match(hi, /'profileCard\.cta': 'प्रोफाइल अपडेट करें'/);
  });

  it('login creates no customer records: sign-in only authenticates and reads the existing CRM-linked account', () => {
    const login = read('src/features/auth/LoginScreen.js'); const auth = read('src/features/auth/AuthContext.js');
    assert.doesNotMatch(login + auth, /\.insert\(|\.upsert\(|auth\.signUp|rpc\('admin_create_buyer/);
    assert.match(login, /signInWithPassword/);
    assert.match(auth, /\.from\('app_users'\)[\s\S]*\.eq\('id', userId\)/);
  });
});
