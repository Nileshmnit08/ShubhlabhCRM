import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function checkSchemaAndTest() {
  const payload = {
    party_id: '00000000-0000-0000-0000-000000000000',
    product_type: 'Pallet',
    quantity: 10,
    unit: 'Bags',
    expected_rate: 100,
    expected_date: '2026-10-10',
    priority: 'Normal',
    intent_type: 'Product Interest',
    status: 'Identified',
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/requirements`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', json);
}

checkSchemaAndTest();
