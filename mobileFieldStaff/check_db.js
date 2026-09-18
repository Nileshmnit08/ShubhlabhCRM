const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';
// Need service role key or admin privileges for some operations, but anon key might work for selection if RLS allows.
// Wait, in 01_sprint_1_schema.sql, we have open policies for development.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('--- Customers with a mobile number ---');
  const { data: customers } = await supabase.from('crm_parties').select('id, display_name, mobile').not('mobile', 'is', null).limit(3);
  console.log(customers);

  console.log('--- Unlinked Call Events ---');
  const { data: calls } = await supabase.from('crm_call_events').select('id, normalized_phone, party_id').is('party_id', null).limit(3);
  console.log(calls);
}
check();
