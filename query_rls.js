require('dotenv').config({ path: './app/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey || supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        schemaname, 
        tablename, 
        policyname, 
        permissive, 
        roles, 
        cmd, 
        qual, 
        with_check 
      FROM pg_policies 
      WHERE tablename = 'field_travel_segments';
    `
  });
  
  if (error) {
    console.error('Error fetching RLS:', error);
    // fallback if execute_sql is not available or we don't have service role key
  } else {
    console.log('RLS Policies for field_travel_segments:', JSON.stringify(data, null, 2));
  }
}
main();
