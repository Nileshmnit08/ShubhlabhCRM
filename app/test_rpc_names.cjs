const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('admin_execute_sql', { query: 'SELECT 1' });
  console.log("admin_execute_sql:", error || "Success");
  
  const { data: d2, error: e2 } = await supabase.rpc('exec', { sql: 'SELECT 1' });
  console.log("exec:", e2 || "Success");
  
  const { data: d3, error: e3 } = await supabase.rpc('execute_query', { query: 'SELECT 1' });
  console.log("execute_query:", e3 || "Success");
}
run();
