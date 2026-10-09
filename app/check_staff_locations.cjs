const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envStr2 = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim().replace(/['"]/g, ''), keyMatch[1].trim().replace(/['"]/g, ''));

async function run() {
  const { data, error } = await supabase
    .from('staff_location_history')
    .select('id, latitude, longitude, accuracy, captured_at, status, session_id')
    .eq('staff_id', '34932213-b6f9-4302-a124-497154565aaa')
    .gte('captured_at', '2026-10-08T00:00:00.000Z')
    .order('captured_at', { ascending: true });
    
  if (error) {
    console.error(error);
  } else {
    console.log(`Found ${data.length} locations for staff on this day`);
    if(data.length > 0) {
      console.log('Sample locations:', data.slice(0, 3));
      
      const sessionIds = new Set();
      data.forEach(p => {
         if (p.session_id) sessionIds.add(p.session_id);
      });
      console.log('Session IDs present:', Array.from(sessionIds));
      
      const noSessionCount = data.filter(p => !p.session_id).length;
      console.log(`Points with NO session_id: ${noSessionCount}`);
    }
  }
}
run();
