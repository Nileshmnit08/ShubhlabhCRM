import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../mobileFieldStaff/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  const { error } = await supabase.from('crm_parties').delete().eq('display_name', 'RLS Test Party');
  if (error) console.error("Cleanup error:", error);
  else console.log("Cleanup done.");
}
cleanup();
