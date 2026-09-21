const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envStr = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim().replace(/['"]/g, ''), keyMatch[1].trim().replace(/['"]/g, ''));

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'crm_notifications'" });
  if (error) {
    console.log("No RPC. Trying to query a single row...");
    const { data: row } = await supabase.from('crm_notifications').select('id').limit(1);
    console.log("Row id:", row);
  } else {
    console.log(data);
  }
}
check();
