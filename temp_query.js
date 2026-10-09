require('dotenv').config({ path: './app/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: reqs, error } = await supabase
    .from('requirements')
    .select('id, quantity, status, requirement_items(quantity)')
    .limit(10)
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(reqs, null, 2));
  }
}
main();
