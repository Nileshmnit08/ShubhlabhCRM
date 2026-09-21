const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envStr = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim().replace(/['"]/g, ''), keyMatch[1].trim().replace(/['"]/g, ''));

async function test() {
  // We need to login to test RLS
  const email = `test_staff_${Date.now()}@example.com`;
  const password = 'Password123!';
  const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
  
  if (authErr) {
    console.log("Signup Error:", authErr);
    return;
  }
  
  const userId1 = authData.user.id;
  const userId2 = '00000000-0000-0000-0000-000000000000'; // Fake user
  
  console.log("Testing getOrCreateConversation...");
  
  try {
    // 1. Check if conversation already exists between these two users
    const { data: user1Convs, error: err1 } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', userId1);

    if (err1) { console.log("err1:", err1); return; }

    const convIds = user1Convs.map(c => c.conversation_id);

    if (convIds.length > 0) {
      const { data: sharedConvs, error: err2 } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', userId2)
        .in('conversation_id', convIds);
        
      if (err2) { console.log("err2:", err2); return; }

      if (sharedConvs && sharedConvs.length > 0) {
        console.log("Exists:", sharedConvs[0].conversation_id);
        return;
      }
    }

    // 2. If no conversation exists, create a new one
    console.log("Creating new conversation...");
    const { data: newConv, error: createErr } = await supabase
      .from('chat_conversations')
      .insert([{}])
      .select()
      .single();

    if (createErr) { console.log("createErr:", createErr); return; }

    // 3. Add participants
    console.log("Adding participants...", newConv);
    const { error: partErr } = await supabase
      .from('chat_participants')
      .insert([
        { conversation_id: newConv.id, user_id: userId1 },
        { conversation_id: newConv.id, user_id: userId2 }
      ]);
      
    if (partErr) { console.log("partErr:", partErr); return; }
    
    console.log("SUCCESS");
  } catch (e) {
    console.log("CRASH:", e);
  }
}
test();
