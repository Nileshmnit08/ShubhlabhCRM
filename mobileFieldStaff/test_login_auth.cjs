
const { createClient } = require('@supabase/supabase-js');

async function testAuth(email, password) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim();
  console.log(`TESTING SUPABASE AUTH AGAINST: ${url}`);
  
  const supabase = createClient(url, key);
  
  console.log(`\nAttempting login for: ${email}`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    console.error(`AUTH RESULT: FAILURE`);
    console.error(`Error name: ${authError.name}`);
    console.error(`Error code: ${authError.code}`);
    console.error(`Error status: ${authError.status}`);
    console.error(`Error message: ${authError.message}`);
    return;
  }
  
  console.log(`AUTH RESULT: SUCCESS`);
  console.log(`Session created: ${!!authData.session}`);
  console.log(`User ID: ${authData.user.id}`);
  
  console.log(`\nQuerying app_users for: ${authData.user.id}`);
  const { data: userData, error: userError } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', authData.user.id)
    .single();
    
  if (userError) {
    console.error(`APP_USER RESULT: RLS/DB ERROR`);
    console.error(`Error code: ${userError.code}`);
    console.error(`Error message: ${userError.message}`);
  } else if (!userData) {
    console.error(`APP_USER RESULT: NOT FOUND`);
  } else {
    console.log(`APP_USER RESULT: FOUND`);
    console.log(`Email in app_users: ${userData.email}`);
    console.log(`Role: ${userData.role}`);
    console.log(`Is Active: ${userData.is_active}`);
    
    if (userData.is_active && userData.role !== 'Admin') {
      console.log(`ROLE RESULT: allowed`);
    } else {
      console.log(`ROLE RESULT: rejected`);
    }
  }
}

async function run() {
  await testAuth('mishika@shubhlabh.com', 'password');
  console.log('\n----------------------------------------');
  await testAuth('nilesh@shubhlabh.com', 'password');
}

run();
