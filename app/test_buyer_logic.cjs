const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envStr = fs.readFileSync('D:/ShubhLabhCRM/shubhlabh-order/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const anonMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseClient = createClient(urlMatch[1].trim(), anonMatch[1].trim());

async function simulateBuyerApp() {
  const { error: loginError } = await supabaseClient.auth.signInWithPassword({ email: 'babulal@shubhlabh.com', password: 'password123' });
  if (loginError) { console.error(loginError); return; }

  const uid = 'babulal-uid'; // doesn't matter for node script because we just get session
  const { data: { session } } = await supabaseClient.auth.getSession();
  const userId = session.user.id;

  const { data: rmData } = await supabaseClient.from('raw_materials').select('id, name_en, name_hi, category').eq('active', true);
  
  const { data: wlData } = await supabaseClient.from('dealer_market_watchlists').select('raw_material_id').eq('buyer_id', userId);
  const watchlistedIds = wlData.map(w => w.raw_material_id);
  console.log("Watchlists:", watchlistedIds);

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

  const { data: prices } = await query.limit(500);
  console.log("Fetched Prices:", prices.length);

  const getTodayPrices = () => {
    if (!watchlistedIds || watchlistedIds.length === 0) return [];
    
    return watchlistedIds.map(rmId => {
      const material = rmData.find(m => m.id === rmId);
      const materialPrices = prices.filter(p => p.raw_material_id === rmId);
      
      const latest = materialPrices[0];
      const previous = materialPrices[1]; 
      
      return {
        material,
        latest,
        previous
      };
    }).filter(item => item.material);
  };

  const todayPrices = getTodayPrices();
  console.dir(todayPrices, { depth: null });
}

simulateBuyerApp();
