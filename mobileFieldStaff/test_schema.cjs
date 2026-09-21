const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envStr = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim().replace(/['"]/g, ''), keyMatch[1].trim().replace(/['"]/g, ''));

async function check() {
  const { data, error } = await supabase.rpc('get_schema_info'); // if exists
  console.log("Checking crm_notifications insert...");
  // just try a dummy insert to see the error
  const { error: err } = await supabase.from('crm_notifications').insert([{ id: '123e4567-e89b-12d3-a456-426614174000', user_id: '123e4567-e89b-12d3-a456-426614174000', title: 'Test' }]);
  console.log("Error:", err);
}
check();
