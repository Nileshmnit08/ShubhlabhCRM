import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });
// Try .env.local if needed
if (!process.env.VITE_SUPABASE_URL) {
  dotenv.config({ path: '.env.local' });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking recent requirements...");
  const { data, error } = await supabase
    .from('requirements')
    .select('id, party_id, product_type, quantity, unit, status, created_at, demand_ref, intent_type')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching requirements:", error);
  } else {
    console.log("Requirements:", JSON.stringify(data, null, 2));
  }
  
  console.log("Checking recent requirement_items...");
  const { data: items, error: itemsError } = await supabase
    .from('requirement_items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (itemsError) {
    console.error("Error fetching items:", itemsError);
  } else {
    console.log("Items:", JSON.stringify(items, null, 2));
  }
}

test();
