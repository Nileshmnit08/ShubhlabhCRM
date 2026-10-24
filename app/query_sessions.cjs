const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const sessionId = '1a8b8b2d-a794-443d-b5bb-edcd29c2bf33';

  console.log(`Checking Session ${sessionId}...`);
  
  const { data: sess } = await supabase.from('staff_tracking_sessions').select('*').eq('id', sessionId).single();
  console.log("DB Distance KM:", sess.total_distance_km);
  console.log("DB Verified Meters:", sess.verified_distance_meters);

  const { data: segments, error: segErr } = await supabase
    .from('field_travel_segments')
    .select('*')
    .eq('session_id', sessionId)
    .order('started_at');
    
  if (segErr) {
    console.log('Error fetching segments', segErr);
  } else {
    console.log(`\nSession Segments (${segments.length}):`);
    segments.forEach(s => console.log(`  ${s.started_at} to ${s.ended_at} | ${s.distance_meters}m | ${s.point_count} pts`));
  }
}
run();
