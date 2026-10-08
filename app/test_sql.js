import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const sql = fs.readFileSync('../105_pending_requirements_view.sql', 'utf8');
  const { data, error } = await supabase.rpc('execute_sql', { sql });
  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("Success executing SQL.");
  }
}
run();
