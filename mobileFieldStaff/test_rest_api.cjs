const { createClient } = require('@supabase/supabase-js');

async function checkRestApi() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim();
  
  const supabase = createClient(url, key);
  
  console.log(`\nTesting REST API connection to: ${url}`);
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error(`REST API FAILURE:`);
    console.error(`Code: ${error.code}`);
    console.error(`Message: ${error.message}`);
    console.error(`Details: ${error.details}`);
    console.error(`Hint: ${error.hint}`);
  } else {
    console.log(`REST API SUCCESS: Retrieved ${data.length} records.`);
  }
}

checkRestApi();
