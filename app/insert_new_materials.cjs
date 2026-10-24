const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envStr = fs.readFileSync('D:/ShubhLabhCRM/shubhlabh-order/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const anonMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseAdmin = createClient(urlMatch[1].trim(), process.env.SUPABASE_SERVICE_ROLE_KEY);

async function queryMaterials() {
  const { data } = await supabaseAdmin.from('raw_materials').select('name_en');
  console.log(data.map(d => d.name_en));
}
queryMaterials();


