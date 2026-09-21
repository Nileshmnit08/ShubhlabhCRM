import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select(`
      id,
      updated_at,
      chat_participants (
        user_id,
        app_users:user_id ( display_name )
      )
    `)
    .order('updated_at', { ascending: false });

  console.log("Error:", error);
  console.log("Data:", data);
}

test();
