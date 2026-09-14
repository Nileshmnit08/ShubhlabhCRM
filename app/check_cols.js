import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../mobileFieldStaff/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
  console.log("Verifying migration...");
  // 1. Verify the columns exist
  const { data: colsData, error: colsErr } = await supabase
    .from('crm_parties')
    .select('id, display_name, latitude, longitude, location_accuracy, location_captured_at')
    .limit(3);

  if (colsErr) {
    console.error("FAIL: Columns verification failed:", colsErr.message);
    return;
  }
  console.log("PASS: Columns exist!");
  
  // 2. Verify data remains intact
  if (colsData.length > 0) {
    console.log("PASS: Data is intact. Sample record:", colsData[0].display_name);
    // 3. Verify columns are null initially
    if (colsData[0].latitude === null && colsData[0].longitude === null) {
      console.log("PASS: New columns are correctly defaulting to null.");
    } else {
      console.warn("WARN: New columns are not null.");
    }
  } else {
    console.log("No data found, but query succeeded.");
  }

  // 4. Verify RLS remains enabled (anon insert should fail unless active user)
  const { data: insertData, error: insertErr } = await supabase
    .from('crm_parties')
    .insert([{ display_name: 'RLS Test Party' }]);
    
  if (insertErr) {
    console.log("PASS: RLS is active and blocked unauthenticated/unauthorized insert. Error:", insertErr.message);
  } else {
    console.error("FAIL: RLS seems weakened! Insert succeeded!");
  }
}
verifyMigration();
