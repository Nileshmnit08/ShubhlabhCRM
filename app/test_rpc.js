import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envStr = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabaseUrl = urlMatch[1].trim().replace(/['"]/g, '');
const supabaseKey = keyMatch[1].trim().replace(/['"]/g, '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  console.log("Calling get_or_create_direct_chat...");
  const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
    target_user_id: '00000000-0000-0000-0000-000000000000'
  });
  
  console.log("Data:", data);
  console.log("Error:", error);
}

testRpc();
