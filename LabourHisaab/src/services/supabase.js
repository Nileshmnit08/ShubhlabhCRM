// Supabase client instance for LabourHisaab
// Credentials come only from EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (.env, not committed).
// Never hard-code project URLs or keys here: this repository is public.

let createClient;
// Plain require, not top-level await: Hermes cannot compile top-level await in release
// bundles. Under Node ESM (tests) `require` is undefined and the catch keeps the fallback.
try {
  const sbModule = require('@supabase/supabase-js');
  createClient = sbModule.createClient;
} catch (e) {
  // CommonJS or bundled fallback
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// No client without configured credentials (the app currently keeps data locally).
export const supabase = createClient && SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export default supabase;
