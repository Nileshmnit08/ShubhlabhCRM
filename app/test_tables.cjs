const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const { data: s_segs } = await supabase.from('staff_travel_segments').select('*').limit(1);
  console.log("staff_travel_segments:", s_segs);

  const { data: f_segs } = await supabase.from('field_travel_segments').select('*').limit(1);
  console.log("field_travel_segments:", f_segs);
  
  const { data: locs2 } = await supabase.from('staff_location_history').select('*').not('session_id', 'is', null).limit(1);
  console.log("staff_location_history with session_id:", locs2);
}
run();
