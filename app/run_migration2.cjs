const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const sql = fs.readFileSync('D:/ShubhLabhCRM/231_sprint_MARKET_PRICES.sql', 'utf8');
  const { data, error } = await supabase.rpc('exec_sql', { sql: sql });
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success!");
  }
}
run();
