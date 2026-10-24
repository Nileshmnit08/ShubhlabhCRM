const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const sql = fs.readFileSync('D:/ShubhLabhCRM/fix_board_requirements.sql', 'utf8');
  const { data, error } = await supabase.rpc('exec_sql', { sql: sql });
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success!");
  }
}
run();
