const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envStr2 = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim().replace(/['"]/g, ''), keyMatch[1].trim().replace(/['"]/g, ''));

async function run() {
  const { data, error } = await supabase
    .from('staff_location_history')
    .select('session_id')
    .limit(100);
    
  if (error) {
    console.error(error);
  } else {
    const sids = new Set(data.map(d => d.session_id));
    console.log('Session IDs in staff_location_history:', Array.from(sids));
    
    // Now get the session details for these
    if(sids.size > 0) {
      const { data: sData } = await supabase
        .from('staff_tracking_sessions')
        .select('*')
        .in('id', Array.from(sids));
      console.log('Sessions:', sData);
    }
  }
}
run();
