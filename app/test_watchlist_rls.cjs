const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envStr = fs.readFileSync('D:/ShubhLabhCRM/shubhlabh-order/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const anonMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseClient = createClient(urlMatch[1].trim(), anonMatch[1].trim());

async function checkRLS() {
  const { error: loginError } = await supabaseClient.auth.signInWithPassword({ email: 'babulal@shubhlabh.com', password: 'password123' });
  if (loginError) { console.error("Login failed", loginError); return; }

  const { data: { session } } = await supabaseClient.auth.getSession();
  const uid = session.user.id;
  
  const { data: wlData, error: wlError } = await supabaseClient
    .from('dealer_market_watchlists')
    .select('raw_material_id')
    .eq('buyer_id', uid);

  console.log("Watchlist Error:", wlError);
  console.log("Watchlist Data:", wlData);
}

checkRLS();
