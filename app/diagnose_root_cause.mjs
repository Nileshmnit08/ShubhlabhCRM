// Final diagnosis: the 500 error means the babulal@shubhlabh.com auth.users row
// was inserted by admin_create_buyer but the auth.identities row is malformed.
// 
// In newer Supabase versions (GoTrue v2.x), auth.identities requires:
//   - provider_id column to match the email (not the user UUID)
//   - identity_data must have the email field, not just sub
//
// The admin_create_buyer in 224_sprint_ORDER_01A inserts:
//   provider_id = new_user_id::text  (WRONG - should be the email for email provider)
//   identity_data = jsonb_build_object('sub', new_user_id, 'email', new_email)
//
// Let's also check if the babulal account was actually created via admin_create_buyer
// or provisioned by some other means. Test by trying a correct-schema signup.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';

// Test with a domain that Supabase accepts (use .com)
console.log('=== Testing with fresh .com email ===');
const signupResp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
  body: JSON.stringify({ email: 'sl_diagnose_xyz_99@gmail.com', password: 'Diagnose123Test!' })
});
const signupBody = await signupResp.json();
console.log('Signup status:', signupResp.status);
if (signupBody.id) {
  console.log('Signup: user created, ID:', signupBody.id);
  console.log('Email confirmed:', signupBody.email_confirmed_at || 'NOT CONFIRMED');
  console.log('Needs confirmation:', !signupBody.email_confirmed_at);
  
  // Try to login without confirming
  const loginResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: 'sl_diagnose_xyz_99@gmail.com', password: 'Diagnose123Test!' })
  });
  const loginBody = await loginResp.json();
  console.log('\nLogin status:', loginResp.status);
  if (loginBody.error || loginBody.msg) {
    console.log('Login error:', loginBody.error_code || loginBody.error, '|', loginBody.msg || loginBody.error_description);
    // If email confirm required → the babulal admin_create_buyer inserted with 
    // email_confirmed_at = now() to bypass this, but the identities row may be wrong format
    console.log('\nCONCLUSION: Email confirmation may be required OR the auth.identities row');
    console.log('for babulal was inserted incorrectly by admin_create_buyer.');
  } else if (loginBody.access_token) {
    console.log('Login WORKS for fresh signup user (no email confirm needed)');
    console.log('This confirms: babulal 500 error is a MALFORMED AUTH.USERS or AUTH.IDENTITIES row');
  }
} else {
  console.log('Signup result:', JSON.stringify(signupBody));
}

// The fix needed:
console.log('\n=== ROOT CAUSE ANALYSIS ===');
console.log('babulal@shubhlabh.com returns HTTP 500 "Database error querying schema"');
console.log('Fresh/nonexistent users return HTTP 400 "invalid_credentials"');
console.log('This means babulal EXISTS in auth.users but the row is MALFORMED.');
console.log('');
console.log('admin_create_buyer inserts auth.identities with:');
console.log('  provider_id = new_user_id::text (UUID string)');
console.log('  This is WRONG for email provider in GoTrue v2+');
console.log('  Correct: provider_id should be the EMAIL address for email provider');
console.log('');
console.log('FIX NEEDED: Delete the malformed auth.users row for babulal');
console.log('and re-create it using the correct schema (provider_id = email).');
console.log('This requires a service_role key or Supabase dashboard action.');
