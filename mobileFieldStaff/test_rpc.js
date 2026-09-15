const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRpc() {
  // 1. Login
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'vishnu@shubhlabh.com',
    password: 'password'
  });

  if (authError) {
    console.error('Login Failed:', authError);
    return;
  }
  
  console.log('Logged in as:', authData.user.id);

  // 2. Test My Work Query
  const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .limit(1);
        
  console.log('Requirements Table schema sample:', JSON.stringify({ data, error }, null, 2));
}
testRpc();
