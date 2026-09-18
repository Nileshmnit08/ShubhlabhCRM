const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const fs = require('fs');
const env = fs.readFileSync('D:\\ShubhLabhCRM\\mobileFieldStaff\\.env', 'utf8');
const key = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, key);

async function validate() {
  await supabase.auth.signInWithPassword({email: 'nilesh@shubhlabh.com', password: 'password'});
  let { data: allCalls, error } = await supabase.from('v_crm_call_events_enriched').select('*').order('created_at', { ascending: false }).limit(5);
  
  if (error) console.error(error);
  console.log(JSON.stringify(allCalls, null, 2));
}
validate();
