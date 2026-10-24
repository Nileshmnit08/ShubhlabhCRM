const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const sessionId = '1a8b8b2d-a794-443d-b5bb-edcd29c2bf33';
  
  const { error } = await supabase.rpc('recalculate_session_distance', { p_session_id: sessionId });
  
  if (error) {
    console.log("Error running recalculate_session_distance:", error);
  } else {
    console.log("Successfully ran recalculate_session_distance");
  }
  
  const { error: err2 } = await supabase.rpc('recalculate_session_segments', { p_session_id: sessionId });
  
  if (err2) {
    console.log("Error running recalculate_session_segments:", err2);
  } else {
    console.log("Successfully ran recalculate_session_segments");
  }
  
  const { data: sess } = await supabase.from('staff_tracking_sessions').select('verified_distance_meters, total_distance_km').eq('id', sessionId).single();
  console.log("After RPC:", sess);
}

run();
