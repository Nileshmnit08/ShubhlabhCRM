const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('D:\\ShubhLabhCRM\\mobileFieldStaff\\.env', 'utf8');
const key = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testLogin() {
  console.log('Logging in as nitesh@shubhlabh.com');
  const { data, error } = await supabase.auth.signInWithPassword({ email: 'nitesh@shubhlabh.com', password: 'password' });
  if (error) {
    console.error('Login Error:', error);
    return;
  }
  console.log('Login Success, User ID:', data.user.id);
  
  const { data: profile, error: profileError } = await supabase.from('app_users').select('*').eq('id', data.user.id).single();
  if (profileError) {
    console.error('Profile Error:', profileError);
  } else {
    console.log('Profile:', profile);
  }
}
testLogin();
