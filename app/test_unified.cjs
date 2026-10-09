const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function calcHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function run() {
  const sessionId = '1a8b8b2d-a794-443d-b5bb-edcd29c2bf33';
  const { data: unified } = await supabase.from('vw_field_session_unified_points')
    .select('*')
    .eq('session_id', sessionId)
    .order('captured_at', { ascending: true });
    
  let totalDistance = 0;
  let prev = null;
  unified.forEach(pt => {
    if (prev) {
      const dist = calcHaversine(prev.latitude, prev.longitude, pt.latitude, pt.longitude);
      const timeDiff = (new Date(pt.captured_at) - new Date(prev.captured_at)) / 1000;
      
      let valid = true;
      if (timeDiff > 7200) valid = false;
      else if (pt.accuracy > 500) valid = false;
      else if (timeDiff > 0 && ((dist/1000)/(timeDiff/3600)) > 150) valid = false;
      
      if (valid && dist >= 15) {
        totalDistance += dist;
        prev = pt;
        console.log(`+ ${dist.toFixed(0)}m (${pt.source})`);
      } else if (valid && dist < 15) {
        // Drift, don't update prev
      }
    } else {
      if (pt.accuracy <= 500) prev = pt;
    }
  });
  console.log("Total computed in JS:", totalDistance);
}
run();
