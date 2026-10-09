require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const sql = fs.readFileSync('../234_sprint_FM_04_segment_engine_rls_fix.sql', 'utf8');
  const { data, error } = await supabase.rpc('execute_sql', { query: sql });
  if (error) {
    console.error('Error executing migration:', error);
  } else {
    console.log('Migration executed successfully:', data);
  }
}
run();
