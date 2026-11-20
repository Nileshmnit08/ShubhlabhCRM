// SL-ANDROID-UNIVERSAL-COMPATIBILITY-01 — the app must reach a screen when optional services are slow, broken or absent.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '../../..');
const read = (r) => fs.readFileSync(path.join(root, r), 'utf8');
const load = (r) => import(pathToFileURL(path.join(root, r)).href);

const memoryBackend = (seed = {}) => { const data = { ...seed }; return { data, getItem: async (k) => (k in data ? data[k] : null), setItem: async (k, v) => { data[k] = v; }, removeItem: async (k) => { delete data[k]; } }; };

describe('resilient storage (saved login) — never blocks or crashes startup', () => {
  it('works like the backend when everything is healthy', async () => {
    const { createResilientStorage } = await load('src/core/api/resilientStorage.js');
    const backend = memoryBackend();
    const s = createResilientStorage({ backend });
    assert.equal(await s.getItem('sb-session'), null, 'no saved data is a normal first launch');
    await s.setItem('sb-session', '{"a":1}');
    assert.equal(await s.getItem('sb-session'), '{"a":1}');
    assert.equal(backend.data['sb-session'], '{"a":1}');
    await s.removeItem('sb-session');
    assert.equal(await s.getItem('sb-session'), null);
  });

  it('an unreadable saved login (e.g. restored from a backup onto a new phone) becomes "no saved login" and is removed', async () => {
    const { createResilientStorage } = await load('src/core/api/resilientStorage.js');
    const errors = [];
    const backend = memoryBackend({ 'sb-session': 'ciphertext-from-another-phone' });
    backend.getItem = async () => { throw new Error('Could not decrypt the value (Keystore key not found)'); };
    const s = createResilientStorage({ backend, onError: (e) => errors.push(e) });
    assert.equal(await s.getItem('sb-session'), null);
    assert.equal(backend.data['sb-session'], undefined, 'the broken entry is deleted so the next launch is clean');
    assert.equal(errors[0].op, 'getItem');
    assert.match(errors[0].message, /decrypt/);
  });

  it('a hung Keystore call times out instead of freezing the splash screen', async () => {
    const { createResilientStorage } = await load('src/core/api/resilientStorage.js');
    const backend = { getItem: () => new Promise(() => {}), setItem: () => new Promise(() => {}), removeItem: () => new Promise(() => {}) };
    const errors = [];
    const s = createResilientStorage({ backend, timeoutMs: 30, onError: (e) => errors.push(e) });
    const t0 = Date.now();
    assert.equal(await s.getItem('k'), null);
    await s.setItem('k2', 'v');
    assert.ok(Date.now() - t0 < 1000);
    assert.ok(errors.some((e) => /timed out/.test(e.message)));
  });

  it('a failed write keeps the session usable for this run; no write ever throws', async () => {
    const { createResilientStorage } = await load('src/core/api/resilientStorage.js');
    const backend = memoryBackend();
    backend.setItem = async () => { throw new Error('keystore write failed'); };
    backend.removeItem = async () => { throw new Error('keystore delete failed'); };
    const errors = [];
    const s = createResilientStorage({ backend, onError: (e) => errors.push(e) });
    await s.setItem('sb-session', 'tok');
    assert.equal(await s.getItem('sb-session'), 'tok', 'still readable in memory');
    await s.removeItem('sb-session');
    assert.equal(await s.getItem('sb-session'), null);
    assert.ok(errors.length >= 2, 'problems are reported, not swallowed silently');
    // a throwing error reporter cannot break storage either
    const s2 = createResilientStorage({ backend, onError: () => { throw new Error('reporter bug'); } });
    await s2.setItem('a', 'b');
  });
});

describe('crash log (support diagnosis without asking the customer)', () => {
  it('records and reads back the last error; never throws', async () => {
    const m = await load('src/core/startup/crashLog.js');
    const backend = memoryBackend();
    assert.equal(await m.recordError(backend, new Error('boom'), { fatal: true, source: 'global' }), true);
    const last = await m.readLastError(backend);
    assert.equal(last.message, 'boom'); assert.equal(last.fatal, true); assert.ok(last.at);
    await m.clearLastError(backend);
    assert.equal(await m.readLastError(backend), null);
    const broken = { getItem: async () => { throw new Error('x'); }, setItem: async () => { throw new Error('x'); }, removeItem: async () => { throw new Error('x'); } };
    assert.equal(await m.recordError(broken, new Error('y')), false);
    assert.equal(await m.readLastError(broken), null);
    assert.equal(m.describeError('plain string').message, 'plain string');
    assert.ok(m.describeError({ message: 'm', stack: 's'.repeat(9000) }).stack.length <= 2000);
  });

  it('the global recorder records, then passes the error to the ORIGINAL handler unchanged (nothing is swallowed)', async () => {
    const m = await load('src/core/startup/crashLog.js');
    const backend = memoryBackend();
    const seen = [];
    let installed;
    const errorUtils = { getGlobalHandler: () => (e, fatal) => seen.push([e.message, fatal]), setGlobalHandler: (h) => { installed = h; } };
    assert.equal(m.installGlobalErrorRecorder(errorUtils, backend), true);
    installed(new Error('fatal one'), true);
    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(seen, [['fatal one', true]], 'original handler still receives the fatal error');
    assert.equal((await m.readLastError(backend)).message, 'fatal one');
    assert.equal(m.installGlobalErrorRecorder(undefined, backend), false);
  });
});

describe('startup wiring', () => {
  it('Supabase saved-login storage goes through the resilient adapter', () => {
    const s = read('src/core/api/supabase.js');
    assert.match(s, /createResilientStorage\(\{/);
    assert.match(s, /storage: ExpoSecureStoreAdapter/);
    assert.doesNotMatch(s, /getItem: \(key\) => \{\s*\n\s*return SecureStore/, 'no unguarded adapter left');
  });

  it('AuthContext: getSession failure shows the login screen, and a watchdog ends "Loading..." even if a request stalls', () => {
    const s = read('src/features/auth/AuthContext.js');
    assert.match(s, /\.catch\(\(err\) => \{\s*\n\s*console\.error\('\[Auth\] getSession failed:', err\);\s*\n\s*clearState\(\);/);
    assert.match(s, /const startupWatchdog = setTimeout\(/);
    assert.match(s, /clearTimeout\(startupWatchdog\);\s*\n\s*subscription\.unsubscribe\(\)/);
    assert.match(s, /export const STARTUP_WATCHDOG_MS = 15000;/);
  });

  it('the app root has an error boundary, the global recorder is installed before the app registers, and diagnostics are guarded', () => {
    assert.match(read('App.js'), /<ErrorBoundary>[\s\S]*<SafeAreaProvider>[\s\S]*<\/SafeAreaProvider>\s*<\/ErrorBoundary>/);
    const idx = read('index.js');
    assert.ok(idx.indexOf('installGlobalErrorRecorder(global.ErrorUtils') < idx.indexOf('registerRootComponent(App)'));
    assert.match(idx, /try \{\s*\n\s*installGlobalErrorRecorder[\s\S]*\} catch/);
    const eb = read('src/shared/components/ErrorBoundary.js');
    assert.match(eb, /getDerivedStateFromError/); assert.match(eb, /componentDidCatch/);
    assert.doesNotMatch(eb, /useAuth|useTranslation|useTheme|from '\.\.\/theme'/, 'the fallback depends on no app provider');
  });

  it('optional services cannot terminate the app: presence, notifications and theme storage all catch their own failures', () => {
    const presence = read('src/features/presence/presenceService.js');
    for (const fn of ['startPresenceSession', 'sendPresenceHeartbeat', 'transitionPresenceBackground', 'transitionPresenceForeground', 'endPresenceSession']) {
      const body = presence.slice(presence.indexOf(`export async function ${fn}`));
      assert.ok(/try \{[\s\S]*?\} catch \(err\) \{[\s\S]*?return \{ success: false/.test(body.slice(0, 900)), `${fn} catches and reports`);
    }
    assert.match(read('src/shared/theme/ThemeProvider.js'), /try \{\s*\n\s*const storedTheme = await AsyncStorage\.getItem[\s\S]*\} catch \(e\) \{\s*\n\s*applyTheme\('system', 'standard'\)/);
    assert.match(read('src/features/notifications/NotificationContext.js'), /\} catch \(e\) \{\s*\n\s*setError\(e\.message/);
  });

  it('startup does not ask for any runtime permission (notification / location / camera are requested only on use)', () => {
    for (const f of ['App.js', 'index.js', 'src/features/auth/AuthContext.js', 'src/features/presence/PresenceContext.js', 'src/features/notifications/NotificationContext.js', 'src/shared/theme/ThemeProvider.js']) {
      assert.doesNotMatch(read(f), /requestForegroundPermissionsAsync|requestPermissionsAsync|PermissionsAndroid|requestCameraPermission/, f);
    }
  });

  it('AndroidManifest: SecureStore is excluded from backup/transfer, and unused sensitive permissions are removed', () => {
    const m = read('android/app/src/main/AndroidManifest.xml');
    assert.match(m, /android:fullBackupContent="@xml\/secure_store_backup_rules"/);
    assert.match(m, /android:dataExtractionRules="@xml\/secure_store_data_extraction_rules"/);
    assert.match(m, /RECORD_AUDIO" tools:node="remove"/);
    assert.match(m, /SYSTEM_ALERT_WINDOW" tools:node="remove"/);
    assert.match(m, /android:name="\.MainActivity"[^>]*android:exported="true"/);
    for (const rule of ['secure_store_backup_rules', 'secure_store_data_extraction_rules']) {
      assert.ok(fs.existsSync(path.join(root, `node_modules/expo-secure-store/android/src/main/res/xml/${rule}.xml`)), `${rule}.xml ships with expo-secure-store`);
    }
  });
});
