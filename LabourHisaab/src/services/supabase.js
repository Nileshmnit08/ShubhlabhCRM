// Supabase client instance for LabourHisaab
// Credentials come only from EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (.env, not committed).
// Never hard-code project URLs or keys here: this repository is public.
// Same setup as Field Assist: URL polyfill + session kept in the device's secure store.
//
// Plain require inside try (not top-level await, not static import): Hermes cannot compile
// top-level await, and under Node ESM (tests) `require` is undefined so the client stays null.

let createClient = null;
let secureStorage = null;
try {
  require('react-native-url-polyfill/auto');
  const SecureStore = require('expo-secure-store');
  secureStorage = {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
  };
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  // Node / test runner: no client.
}

const clean = (v) => String(v || '').replace(/^["']|["']$/g, '').replace(/[\r\n]+/g, '').trim();
const SUPABASE_URL = clean(process.env.EXPO_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON_KEY = clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const isCloudConfigured = Boolean(createClient && SUPABASE_URL && SUPABASE_ANON_KEY);

// No client without configured credentials; the app then works fully offline (device storage).
export const supabase = isCloudConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: secureStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export default supabase;
