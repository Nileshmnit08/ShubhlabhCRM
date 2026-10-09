const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';
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
