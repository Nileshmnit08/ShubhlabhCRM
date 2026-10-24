const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const staffId = '34932213-b6f9-4302-a124-497154565aaa'; // A user with 91.25 km
  const startStr = '2026-10-01';
  const endStr = '2026-10-31';

  // Issue B Test
  const { data: recSessions } = await supabase.from('vw_field_session_reconciliation')
    .select('staff_id, business_date, verified_distance_meters')
    .eq('staff_id', staffId)
    .gte('business_date', startStr)
    .lte('business_date', endStr);
    
  const { data: rates } = await supabase.from('travel_expense_rates')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('effective_from', { ascending: false });

  let totalExpense = 0;
  const verifiedKmByStaffDay = {};
  recSessions.forEach(s => {
      const key = `${s.staff_id}_${s.business_date}`;
      if (!verifiedKmByStaffDay[key]) verifiedKmByStaffDay[key] = 0;
      verifiedKmByStaffDay[key] += (s.verified_distance_meters || 0) / 1000;
  });

  Object.keys(verifiedKmByStaffDay).forEach(key => {
      const verifiedKm = verifiedKmByStaffDay[key];
      const business_date = key.split('_')[1];
      const expDate = new Date(business_date);
      const applicableRate = (rates || []).find(r => new Date(r.effective_from) <= expDate && (!r.effective_to || new Date(r.effective_to) >= expDate));
      
      const calcAmount = applicableRate ? (verifiedKm * applicableRate.rate_per_km) : 0;
      console.log(`Date: ${business_date}, KM: ${verifiedKm}, Rate: ${applicableRate?.rate_per_km || 0}, Amount: ${calcAmount}`);
      totalExpense += calcAmount;
  });
  
  console.log("Total Expense from custom logic:", totalExpense);
  
}
run();
