const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkMismatch() {
  const { data: expenses } = await supabase.from('daily_travel_expenses').select('*');
  const { data: sessions } = await supabase.from('staff_tracking_sessions').select('*').in('status', ['CLOSED']);
  
  const aggregatedSessions = {};
  sessions.forEach(s => {
    const key = `${s.staff_id}_${s.business_date}`;
    if (!aggregatedSessions[key]) aggregatedSessions[key] = 0;
    aggregatedSessions[key] += s.verified_distance_meters || 0;
  });
  
  let mismatches = 0;
  expenses.forEach(exp => {
    const key = `${exp.staff_id}_${exp.business_date}`;
    const expectedKm = (aggregatedSessions[key] || 0) / 1000;
    const actualKm = exp.total_distance_km || 0;
    
    if (Math.abs(expectedKm - actualKm) > 0.1) {
      console.log(`Mismatch for ${key}: Expected KM (from verified) = ${expectedKm}, Actual KM in daily_travel_expenses = ${actualKm}`);
      mismatches++;
    }
  });
  console.log(`Found ${mismatches} mismatches out of ${expenses.length} records.`);
}

checkMismatch();
