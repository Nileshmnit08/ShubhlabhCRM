const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';
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
