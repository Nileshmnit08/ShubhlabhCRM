const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const sessionId = '1a8b8b2d-a794-443d-b5bb-edcd29c2bf33'; // Known session from previous sprint
  
  const { data: visits } = await supabase.from('crm_visits')
    .select('id, started_at, ended_at')
    .eq('staff_id', '34932213-b6f9-4302-a124-497154565aaa')
    .order('started_at');
    
  console.log("Visits:", visits);

  const { data: segs } = await supabase.from('field_travel_segments')
    .select('id, started_at, ended_at, distance_meters')
    .eq('session_id', sessionId)
    .order('started_at');
    
  console.log("Segments:", segs);
}
run();
