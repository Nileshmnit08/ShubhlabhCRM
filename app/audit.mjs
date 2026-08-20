import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
global.WebSocket = ws;
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.from('tally_transactions').select('*').limit(1);
  if (error) {
    console.log("tally_transactions error:", error.message);
  } else {
    console.log("tally_transactions sample:", JSON.stringify(data[0]));
  }
}
checkSchema();
