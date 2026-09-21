const { createClient } = require('@supabase/supabase-js');

async function checkQuery() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim();
  
  const supabase = createClient(url, key);
  
  console.log(`Testing FIX for mobile getConversations query shape...`);
  
  const { data, error } = await supabase
    .from('chat_participants')
    .select(`
      conversation_id,
      chat_conversations (
        id,
        updated_at,
        chat_participants (
          user_id
        )
      )
    `)
    .limit(1);
    
  if (error) {
    console.error(`QUERY FAILED:`);
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.log(`QUERY SUCCESS.`);
    console.log(JSON.stringify(data, null, 2));
  }
}

checkQuery();
