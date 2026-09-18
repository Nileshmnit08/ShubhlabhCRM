const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function validate() {
  await supabase.auth.signInWithPassword({email: 'vishnu@shubhlabh.com', password: 'password'});
  let { data: allCalls, error } = await supabase.from('crm_call_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
  
  if (error) console.error(error);
  console.log(JSON.stringify(allCalls, null, 2));
}
validate();
