const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const sessionId = '1a8b8b2d-a794-443d-b5bb-edcd29c2bf33'; // From earlier

  console.log("Checking points for session...");
  const { data: points, error: pErr } = await supabase
    .from('staff_location_history')
    .select('id, captured_at, status, segment_distance_m')
    .eq('session_id', sessionId)
    .order('captured_at');
    
  if (pErr) console.error(pErr);
  else console.log(`Points count: ${points.length}, Sum distance: ${points.reduce((a, p) => a + (p.segment_distance_m || 0), 0)}`);

  console.log("Checking visits...");
  const { data: visits, error: vErr } = await supabase
    .from('crm_visits')
    .select('id, started_at, ended_at, display_name:crm_parties(display_name)')
    .eq('staff_id', '34932213-b6f9-4302-a124-497154565aaa')
    .order('started_at');
    
  if (vErr) console.error(vErr);
  else {
    visits.forEach(v => {
      console.log(`Visit ${v.id} | Start: ${v.started_at} | End: ${v.ended_at} | ${v.display_name?.display_name}`);
    });
  }
}
run();
