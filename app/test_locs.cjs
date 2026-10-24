const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase.from('staff_location_history').select('*').limit(5);
  console.log("Location history:", data);
  
  const { data: count } = await supabase.from('staff_location_history').select('id', { count: 'exact' });
  console.log("Total points:", count);
}
run();
