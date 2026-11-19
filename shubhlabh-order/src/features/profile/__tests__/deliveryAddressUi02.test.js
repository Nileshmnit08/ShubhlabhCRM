// SL-ORDER-DELIVERY-ADDRESS-UI-02 — premium visual refinement; every existing action must be unchanged.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '../../../..');
const rel = 'src/features/profile/DeliveryAddressScreen.js';
const read = (r) => fs.readFileSync(path.join(root, r), 'utf8');
const src = read(rel);
const between = (text, from, to) => { const a = text.indexOf(from); const b = text.indexOf(to, a); assert.ok(a >= 0 && b > a, `${from} … ${to}`); return text.slice(a, b); };

describe('Delivery Addresses screen: UI refined, behaviour unchanged', () => {
  it('state initialisation, location capture and save handlers are byte-identical to the committed version', () => {
    let head;
    try { head = execFileSync('git', ['show', `HEAD:shubhlabh-order/${rel}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { head = null; }
    if (!head) return; // not a git checkout: the explicit checks below still run
    // compared line by line ignoring trailing whitespace; the only addition after the handlers is `const busy`
    const stripBusy = (t) => t.replace(/\n\s*const busy = isSaving \|\| isCapturing;/, '');
    const headSection = (t) => { const i = t.indexOf('  const handleSave'); return t.slice(i, t.indexOf('  return (\n', i)).split('\n').map((l) => l.trimEnd()).join('\n').trim(); };
    const top = (t) => between(t, '  const existingAddress =', '  const handleSave').split('\n').map((l) => l.trimEnd()).join('\n').trim();
    assert.equal(top(src), top(head), 'state and location capture are unchanged');
    assert.equal(stripBusy(headSection(src)).trim(), headSection(head), 'save handler is unchanged');  });

  it('existing actions are wired to the same handlers with the same disabled rules', () => {
    assert.match(src, /onPress=\{handleCaptureLocation\}\s*\n\s*disabled=\{busy\}/);
    assert.match(src, /onPress=\{handleSave\}\s*\n\s*disabled=\{busy\}/);
    assert.match(src, /const busy = isSaving \|\| isCapturing;/);
    assert.match(src, /onChangeText=\{setAddress\}/);
    assert.match(src, /onChangeText=\{setVillage\}/);
    assert.match(src, /Location\.requestForegroundPermissionsAsync\(\)/);
    assert.match(src, /Location\.getCurrentPositionAsync\(\{ accuracy: Location\.Accuracy\.Balanced \}\)/);
    assert.match(src, /Location\.reverseGeocodeAsync\(/);
    assert.match(src, /supabase\.auth\.updateUser\(\{\s*\n\s*data: \{ deliveryAddress: deliveryData \}/);
    assert.match(src, /if \(!address\) \{\s*\n\s*Alert\.alert\(isHindi \? 'त्रुटि' : 'Error', isHindi \? 'कृपया पता दर्ज करें।' : 'Please enter an address\.'\);/);
  });

  it('back navigation behaves like the shared header (goBack, else MainTabs); route and stack registration unchanged', () => {
    assert.match(src, /navigation\.canGoBack && navigation\.canGoBack\(\)\) navigation\.goBack\(\);\s*\n\s*else if \(navigation\.navigate\) navigation\.navigate\('MainTabs'\)/);
    assert.match(read('src/navigation/ProfileStackNavigator.js'), /name="DeliveryAddress" component=\{DeliveryAddressScreen\}/);
  });

  it('keeps the floating support button and four-tab bar (both global, not touched) and leaves room for them', () => {
    assert.doesNotMatch(src, /GlobalHelpFab|tabBar/i);
    assert.match(src, /paddingBottom: 120/);
    assert.match(read('src/navigation/MainTabNavigator.js'), /ProfileTab/);
  });

  it('keyboard-safe: scrolls, keeps taps while the keyboard is open, avoids the keyboard on iOS', () => {
    assert.match(src, /<KeyboardAvoidingView style=\{\{ flex: 1 \}\} behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}>/);
    assert.match(src, /keyboardShouldPersistTaps="handled"/);
  });

  it('no fake behaviour or hardcoded address values; Address is marked required because it is the validated field', () => {
    assert.doesNotMatch(src, /Jaipur|F777|setAddress\('|setVillage\('/);
    assert.match(src, /\{isHindi \? 'पता \/ मोहल्ला' : 'Address \/ Locality'\} <Text style=\{styles\.required\}>\*<\/Text>/);
    const village = between(src, "'गाँव / शहर' : 'Village / Town'", '</Text>');
    assert.doesNotMatch(village, /required/, 'Village is optional in the existing validation, so it is not starred');
  });

  it('visual design: gradient header, illustration, location card, one form card with icons, save button, note', () => {
    for (const frag of ['<LinearGradient id="hdr"', '<DeliveryIllustration', 'styles.locationCard', 'styles.formCard', '<MapPin size={24}', '<Building2 size={24}', 'styles.saveButton', '<Save size={24}', 'styles.note']) assert.ok(src.includes(frag), frag);
    const order = ['<GradientHeader', '<DeliveryIllustration', 'styles.locationCard', 'styles.formCard', 'styles.note'].map((f) => src.indexOf(f, src.indexOf('export default function')));
    assert.deepEqual(order, [...order].sort((x, y) => x - y));
    assert.match(src, /minHeight: 58/); // large, easy-to-tap Save button
  });

  it('English and Hindi text exists for every new label', () => {
    const en = read('src/shared/localization/en.js'); const hi = read('src/shared/localization/hi.js');
    for (const k of ['heading', 'subheading', 'noteTitle', 'note']) {
      assert.match(en, new RegExp(`'deliveryAddress\\.${k}': '`));
      const h = hi.match(new RegExp(`'deliveryAddress\\.${k}': '([^']+)'`));
      assert.ok(h && /[ऀ-ॿ]/.test(h[1]), `hi ${k}`);
      assert.match(src, new RegExp(`t\\('deliveryAddress\\.${k}'\\)`));
    }
  });
});
