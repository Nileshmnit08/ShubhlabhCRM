import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'mock-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking v_customer_timeline...");
  const res1 = await supabase.from('v_customer_timeline').select('*').limit(1);
  console.log("res1:", res1.error || "Success");

  console.log("Checking v_field_staff_activity_timeline...");
  const res2 = await supabase.from('v_field_staff_activity_timeline').select('*').limit(1);
  console.log("res2:", res2.error || "Success");
}
check();
