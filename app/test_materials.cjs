const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const backupEnvStr = fs.readFileSync('D:/ShubhLabhCRM/supabase/.env', 'utf-8');
const backupKeyMatch = backupEnvStr.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const backupUrlMatch = backupEnvStr.match(/SUPABASE_URL=(.*)/);
const supabase = createClient(backupUrlMatch[1].trim().replace(/['"]/g, ''), backupKeyMatch[1].trim().replace(/['"]/g, ''));

async function check() {
  const { data: materials, error: mErr } = await supabase.from('raw_materials').select('*');
  console.log("Materials:", materials?.length, mErr);
  
  const { data: prices, error: pErr } = await supabase.from('raw_material_price_entries').select('*').limit(5);
  console.log("Prices:", prices?.length, pErr);
  
  const { data: units, error: uErr } = await supabase.from('rm_units').select('*');
  console.log("Units:", units?.length, uErr);
}

check().catch(console.error);
