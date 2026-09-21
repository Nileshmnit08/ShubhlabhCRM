const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
// The web app doesn't have .env! Wait, it has .env in mobileFieldStaff.
const envStr2 = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr2.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim().replace(/['"]/g, ''), keyMatch[1].trim().replace(/['"]/g, ''));

async function run() {
  // Try to query chat_conversations just like StaffMessages.jsx
  const { data: convData, error: convError } = await supabase
    .from('chat_conversations')
    .select(`
      id,
      updated_at,
      chat_participants (
        user_id
      )
    `)
    .order('updated_at', { ascending: false });
    
  console.log("convData:", convData);
  console.log("convError:", convError);
}
run();
