import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../mobile/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  const tables = ['staff_locations', 'user_locations', 'location_events', 'locations', 'tracking'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === '42P01') {
      console.log(`${table} does not exist.`);
    } else if (error) {
      console.log(`${table} exists but error:`, error.message);
    } else {
      console.log(`${table} EXISTS!`);
    }
  }
}

listTables();
