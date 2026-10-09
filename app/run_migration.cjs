const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';
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
