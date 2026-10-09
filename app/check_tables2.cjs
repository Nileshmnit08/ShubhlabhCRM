const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envStr2 = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
// For information_schema we might need to use RPC or we can just fetch tables using another script
const fetch = require('node-fetch'); // we'll just use REST if we have the anon key... wait, anon key can't read information schema

// Actually let's just query a few guessed table names
async function run() {
  const supabase = createClient(urlMatch[1].trim().replace(/['"]/g, ''), keyMatch[1].trim().replace(/['"]/g, ''));
  const tables = ['staff_location_history', 'field_tracking_locations', 'field_locations', 'field_mobility_locations', 'tracking_locations'];
  for (let t of tables) {
    const { data, error } = await supabase.from(t).select('id').limit(1);
    if (error) {
      console.log(`Table ${t} error:`, error.message);
    } else {
      console.log(`Table ${t} exists and has data?`, data.length > 0);
    }
  }
}
run();
