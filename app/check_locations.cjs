const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envStr2 = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim().replace(/['"]/g, ''), keyMatch[1].trim().replace(/['"]/g, ''));

async function run() {
  const { data, error } = await supabase
    .from('staff_location_history')
    .select('id, latitude, longitude, accuracy, captured_at, status, segment_distance_m, implied_speed_kmh, session_id')
    .eq('session_id', '1a8b8b2d-a794-443d-b5bb-edcd29c2bf33')
    .order('captured_at', { ascending: true });
    
  if (error) {
    console.error(error);
  } else {
    console.log(`Found ${data.length} locations`);
    if (data.length > 0) {
      console.log('First:', data[0]);
      console.log('Last:', data[data.length - 1]);
      
      const totalDist = data.reduce((acc, p) => acc + (p.segment_distance_m || 0), 0);
      console.log('Total segment_distance_m:', totalDist);
      
      const statusCounts = {};
      data.forEach(p => {
         statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      });
      console.log('Status counts:', statusCounts);
    }
  }
}
run();
