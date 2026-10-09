const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';

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
