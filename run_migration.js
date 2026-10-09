require('dotenv').config({ path: './shubhlabh-order/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = fs.readFileSync('./234_sprint_FM_04_segment_engine_rls_fix.sql', 'utf8');
  const { data, error } = await supabase.rpc('execute_sql', { query: sql });
  if (error) {
    console.error('Error executing migration:', error);
  } else {
    console.log('Migration executed successfully:', data);
  }
}
run();
