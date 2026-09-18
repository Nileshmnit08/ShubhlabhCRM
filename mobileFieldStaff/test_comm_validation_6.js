const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const fs = require('fs');
const env = fs.readFileSync('D:\\ShubhLabhCRM\\mobileFieldStaff\\.env', 'utf8');
const key = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];
const supabase = createClient(supabaseUrl, key);

async function validate() {
  await supabase.auth.signInWithPassword({email: 'nilesh@shubhlabh.com', password: 'password'});
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  let { data: allCalls, error } = await supabase.rpc('get_communication_dashboard_grouped', {
    p_start_date: thirtyDaysAgo.toISOString(),
    p_end_date: now.toISOString(),
    p_staff_id: null,
    p_search: null,
    p_sort_key: 'started_at',
    p_sort_direction: 'desc',
    p_limit: 10,
    p_offset: 0
  });
  
  if (error) console.error(error);
  console.log(JSON.stringify(allCalls, null, 2));
}
validate();
