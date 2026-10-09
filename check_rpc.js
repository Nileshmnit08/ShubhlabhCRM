require('dotenv').config({ path: './shubhlabh-order/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRpc() {
  const { data, error } = await supabase.rpc('help'); 
  console.log('rpc help result:', error || data);
}
checkRpc();
