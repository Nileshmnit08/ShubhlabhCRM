import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'D:/ShubhLabhCRM/shubhlabh-order/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProducts() {
  console.log('Fetching all products...');
  const { data, error } = await supabase.from('products').select('*');
  console.log('Error:', error);
  console.log('Products count:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('First product:', data[0]);
  }
}

checkProducts();
