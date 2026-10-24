const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  try {
    const { data, error } = await supabase.from('app_users').select('*').eq('id', undefined);
    console.log("Success?", data);
  } catch (err) {
    console.error("Caught error:", err.message);
  }
}
run();
