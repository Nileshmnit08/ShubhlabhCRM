import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
// We use the service role key to bypass RLS for debugging
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findSessions() {
  const { data, error } = await supabase
    .from('staff_tracking_sessions')
    .select(`
      id, staff_id, started_at, ended_at, distance_km, is_active, 
      app_users(display_name)
    `)
    .order('started_at', { ascending: false })
    .limit(50);
    
  if (error) {
    console.error(error);
    return;
  }
  
  data.forEach(s => {
    console.log(`Session: ${s.id} | Staff: ${s.app_users?.display_name} | Start: ${s.started_at} | End: ${s.ended_at} | Distance: ${s.distance_km}`);
  });
}

findSessions();
