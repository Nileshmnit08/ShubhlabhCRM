const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envStr = fs.readFileSync('D:/ShubhLabhCRM/shubhlabh-order/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';

const supabase = createClient(urlMatch[1].trim(), SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_tables_list'); // doesn't exist, we can use a raw sql or information_schema if we had postgres access.
  // Instead, let's just query a potential table name to see if it errors.
  const checkTable = async (name) => {
      const { error } = await supabase.from(name).select('*').limit(1);
      if (error && error.code !== 'PGRST116') {
          console.log(`Table ${name} check error:`, error.message);
      } else {
          console.log(`Table ${name} exists!`);
      }
  };
  
  await checkTable('customer_prices');
  await checkTable('customer_price_entries');
  await checkTable('market_prices');
  await checkTable('published_prices');
  await checkTable('raw_material_price_entries');
}

check();
