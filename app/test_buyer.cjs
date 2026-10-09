const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envStr = fs.readFileSync('D:/ShubhLabhCRM/shubhlabh-order/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const anonMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';

const supabaseAdmin = createClient(urlMatch[1].trim(), SERVICE_ROLE_KEY);

async function testBuyer() {
  const { data: buyers } = await supabaseAdmin.from('app_users').select('*').eq('role', 'Buyer').limit(1);
  if (buyers.length === 0) {
     console.log("No buyers found!");
     return;
  }
  const buyer = buyers[0];
  console.log("Found buyer:", buyer.email);

  const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(buyer.id, { password: 'password123' });
  if (updateError) { console.error(updateError); return; }

  const supabaseClient = createClient(urlMatch[1].trim(), anonMatch[1].trim());
  const { error: loginError } = await supabaseClient.auth.signInWithPassword({ email: buyer.email, password: 'password123' });
  if (loginError) { console.error(loginError); return; }

  const { data: wlData, error: wlError } = await supabaseClient
    .from('dealer_market_watchlists')
    .select('raw_material_id')
    .eq('buyer_id', buyer.id);

  if (wlError) { console.error("Watchlist error:", wlError); return; }

  const watchlistedIds = wlData.map(w => w.raw_material_id);
  console.log("Watchlist IDs:", watchlistedIds);

  if (watchlistedIds.length === 0) {
      console.log("No watchlisted IDs found for buyer. Inserting...");
      const { data: rm } = await supabaseClient.from('raw_materials').select('id, name_en').eq('name_en', 'Khal').single();
      await supabaseAdmin.from('dealer_market_watchlists').insert({ buyer_id: buyer.id, raw_material_id: rm.id });
      watchlistedIds.push(rm.id);
  }

  let query = supabaseClient
    .from('customer_published_prices')
    .select('id, raw_material_id, price, effective_date, unit, created_at')
    .in('raw_material_id', watchlistedIds)
    .eq('is_published', true)
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false });

  const d = new Date();
  d.setDate(d.getDate() - 7);
  query = query.gte('effective_date', d.toISOString().split('T')[0]);

  const { data: priceData, error: priceError } = await query.limit(500);
  console.log("Buyer prices query:", priceError || priceData);
}
testBuyer();
