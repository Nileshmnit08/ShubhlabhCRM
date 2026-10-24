const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  console.log("Reading migration file...");
  const sql = fs.readFileSync('D:/ShubhLabhCRM/232_sprint_CUSTOMER_PRICES.sql', 'utf8');
  
  console.log("Executing SQL...");
  const { data, error } = await supabase.rpc('execute_sql', { query: sql });
  
  if (error) {
    // sometimes the parameter is named 'sql' instead of 'query' depending on how it was created
    const { data: d2, error: e2 } = await supabase.rpc('execute_sql', { sql: sql });
    if (e2) {
       console.error("RPC Error:", e2);
    } else {
       console.log("Success with 'sql' param.");
    }
  } else {
    console.log("Success executing SQL.");
  }
}
run();
