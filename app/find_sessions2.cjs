const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envStr2 = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim().replace(/['"]/g, ''), keyMatch[1].trim().replace(/['"]/g, ''));

async function run() {
  const { data, error } = await supabase
    .from('vw_field_session_reconciliation')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1);
  console.log(JSON.stringify(data, null, 2));
}
run();
