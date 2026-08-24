import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchemaAndTest() {
  console.log('Fetching requirements...');
  
  // Just try an insert without RLS (wait, anon key might not have permission, but we can see the exact error)
  // Let's first just try to insert a dummy row.
  const { data, error } = await supabase.from('requirements').insert({
    party_id: '00000000-0000-0000-0000-000000000000',
    product_type: 'Pallet',
    quantity: 10,
    unit: 'Bags',
    expected_rate: 100,
    expected_date: '2026-10-10',
    priority: 'Normal',
    intent_type: 'Product Interest',
    status: 'Identified',
  }).select();
  
  console.log('Error:', error);
}

checkSchemaAndTest();
