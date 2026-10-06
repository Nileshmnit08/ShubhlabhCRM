import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fwkjddflpzkowlawkmka.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q'
);

async function test() {
  console.log('Testing auth for babulal@shubhlabh.com...');
  
  // Test signInWithPassword
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'babulal@shubhlabh.com',
    password: 'password'
  });

  if (error) {
    console.log('AUTH ERROR:', error.message, '| Status:', error.status, '| Code:', error.code);
    return;
  }

  const userId = data.session?.user?.id;
  console.log('AUTH SUCCESS');
  console.log('User ID:', userId);
  console.log('Email confirmed:', data.session?.user?.email_confirmed_at ? 'YES' : 'NO');

  // Check app_users record
  const { data: appUser, error: auErr } = await supabase
    .from('app_users')
    .select('id, role, is_active, crm_party_id, display_name')
    .eq('id', userId)
    .single();

  if (auErr) {
    console.log('app_users fetch error:', auErr.message, '| Code:', auErr.code);
  } else {
    console.log('app_users record:');
    console.log('  role:', appUser.role);
    console.log('  is_active:', appUser.is_active);
    console.log('  crm_party_id:', appUser.crm_party_id);
    console.log('  display_name:', appUser.display_name);
  }

  await supabase.auth.signOut();
  console.log('Signed out.');
}

test().catch(console.error);
