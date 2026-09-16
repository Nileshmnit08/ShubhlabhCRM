const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fwkjddflpzkowlawkmka.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q'
);

async function testLogin() {
  console.log('Attempting login...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'pradeep@shubhlabh.com',
    password: 'password'
  });
  
  if (error) {
    console.log('Login error:', error.message);
    return;
  }
  
  console.log('Login successful for user:', data.user.id);
  
  console.log('Fetching app_users profile...');
  const { data: profile, error: profileError } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', data.user.id)
    .single();
    
  if (profileError) {
    console.log('Profile fetch error:', profileError.message);
  } else {
    console.log('Profile data:', profile);
    if (profile.is_active && profile.role !== 'Admin') {
      console.log('Authorization SUCCESSFUL for Field Assistant.');
    } else {
      console.log('Authorization FAILED. is_active:', profile.is_active, 'role:', profile.role);
    }
  }
}

testLogin();
