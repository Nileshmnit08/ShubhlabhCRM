require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  let { data, error } = await supabase.rpc('execute_sql', {
    query: `SELECT tgname, tgfoid::regproc FROM pg_trigger WHERE tgrelid = 'staff_travel_segments'::regclass;`
  });
  console.log('Triggers on staff_travel_segments:', data || error);

  let { data: d2, error: e2 } = await supabase.rpc('execute_sql', {
    query: `SELECT tgname, tgfoid::regproc FROM pg_trigger WHERE tgrelid = 'field_travel_segments'::regclass;`
  });
  console.log('Triggers on field_travel_segments:', d2 || e2);
}
run();
