import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('=== SL-ORDER AUTH DIAGNOSIS ===\n');
  console.log('Supabase URL:', SUPABASE_URL);
  
  // Test 1: Raw fetch to Supabase Auth endpoint
  console.log('\n--- TEST 1: Raw POST to /auth/v1/token ---');
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: 'babulal@shubhlabh.com', password: 'password' })
    });
    const body = await resp.json();
    console.log('HTTP Status:', resp.status);
    if (body.error) {
      console.log('Error code:', body.error);
      console.log('Error description:', body.error_description);
    } else if (body.access_token) {
      console.log('RESULT: AUTH SUCCESS — token received');
      console.log('User ID:', body.user?.id);
      console.log('Email confirmed:', body.user?.email_confirmed_at ? 'YES' : 'NO');
      console.log('Role metadata:', JSON.stringify(body.user?.app_metadata));
    } else {
      console.log('Unexpected response:', JSON.stringify(body).substring(0, 500));
    }
  } catch (err) {
    console.log('NETWORK ERROR:', err.message);
  }

  // Test 2: Try admin_create_buyer to check if function signature is correct
  console.log('\n--- TEST 2: Check admin_create_buyer function signature ---');
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_create_buyer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        new_email: 'test@test.com',
        new_password: 'test123',
        new_display_name: 'Test',
        new_crm_party_id: '00000000-0000-0000-0000-000000000000',
        new_is_active: true
      })
    });
    const body = await resp.json();
    console.log('HTTP Status:', resp.status);
    console.log('Response:', JSON.stringify(body).substring(0, 300));
  } catch (err) {
    console.log('NETWORK ERROR:', err.message);
  }

  // Test 3: Try to query app_users table (anon, should be blocked by RLS)
  console.log('\n--- TEST 3: app_users table accessible to anon? ---');
  const { data, error } = await supabase.from('app_users').select('id, role').limit(1);
  if (error) {
    console.log('RLS working - anon blocked:', error.code, error.message);
  } else {
    console.log('WARNING: anon can see app_users! rows:', data?.length);
  }

  // Test 4: Check if handle_new_user trigger is causing schema error
  console.log('\n--- TEST 4: Check auth.users table structure ---');
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: 'nonexistent_xyz_999@shubhlabh.com', password: 'wrongpassword' })
    });
    const body = await resp.json();
    console.log('HTTP Status for NONEXISTENT user:', resp.status);
    console.log('Error for nonexistent user:', body.error, '|', body.error_description);
  } catch (err) {
    console.log('NETWORK ERROR:', err.message);
  }
}

diagnose().catch(console.error);
