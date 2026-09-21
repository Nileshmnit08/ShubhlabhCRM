const { createClient } = require('@supabase/supabase-js');

async function run() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim();
  const supabase = createClient(url, key);

  console.log('Querying for Vishnu to get his User ID...');
  const { data: users, error: userError } = await supabase
    .from('app_users')
    .select('*')
    .eq('email', 'vishnu@shubhlabh.com');

  if (userError || !users || users.length === 0) {
    console.error('Could not find Vishnu:', userError);
    return;
  }
  
  const vishnuId = users[0].id;
  console.log(`Vishnu User ID: ${vishnuId}`);

  console.log('\nExecuting mobile query...');
  const { data, error } = await supabase
    .from('chat_participants')
    .select(`
      conversation_id,
      chat_conversations (
        id,
        updated_at
      ),
      other_participants:chat_participants (
        user_id
      )
    `)
    .eq('user_id', vishnuId)
    .order('conversation_id', { ascending: false });

  if (error) {
    console.error('MOBILE QUERY ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log(`MOBILE QUERY SUCCESS: ${data.length} rows`);
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
