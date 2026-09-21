const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envStr = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim().replace(/['"]/g, ''), keyMatch[1].trim().replace(/['"]/g, ''));

async function test() {
  const { data, error } = await supabase.from('app_users').select('id, display_name').in('id', []);
  console.log('DATA:', data);
  console.log('ERROR:', error);
}
test();
