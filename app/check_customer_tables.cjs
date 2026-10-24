const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envStr = fs.readFileSync('D:/ShubhLabhCRM/shubhlabh-order/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(urlMatch[1].trim(), SERVICE_ROLE_KEY);

async function check() {
  const { data: rmData, error: rmError } = await supabase.from('raw_materials').select('*').limit(1);
  console.log("Raw materials:", rmError || rmData);
  
  const { data: userData, error: userError } = await supabase.from('app_users').select('*').limit(1);
  console.log("App users:", userError || userData);
}

check();
