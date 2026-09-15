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
        .from('v_salesperson_work_queue')
        .select('*')
        .eq('assigned_owner_id', authData.user.id)
        .order('priority_score', { ascending: true })
        .order('relevant_date', { ascending: true });
        
  console.log('My Work Query Result:', JSON.stringify({ data, error }, null, 2));

  // 3. Test if any follow ups exist at all (since v_salesperson_work_queue might fail)
  const { data: fData, error: fError } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('assigned_to', authData.user.id)
        .limit(5);
        
  console.log('Follow-ups Table Query Result:', JSON.stringify({ data: fData, error: fError }, null, 2));
}
testRpc();
