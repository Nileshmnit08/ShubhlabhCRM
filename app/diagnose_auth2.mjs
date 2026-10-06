// Check what version of @supabase/supabase-js is being used and test the
// exact auth.identities structure needed.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';

// Try to get the auth admin API info
console.log('=== Supabase Version & Auth Endpoints ===');

// Check /.well-known/jwks.json 
const r1 = await fetch(`${SUPABASE_URL}/auth/v1/settings`);
const settings = await r1.json();
console.log('Auth settings status:', r1.status);
console.log('Auth settings:', JSON.stringify(settings, null, 2).substring(0, 1000));

// Try to do a signup (new user) to understand what the identities table expects
// We use a fake email that won't conflict
console.log('\n=== TEST: Signup endpoint response structure ===');
const signupResp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
  body: JSON.stringify({ email: 'diagnosetest_xyz_delete@shubhlabh.local', password: 'Diagnose123!' })
});
const signupBody = await signupResp.json();
console.log('Signup status:', signupResp.status);
if (signupBody.id) {
  console.log('NEW USER ID:', signupBody.id);
  console.log('Email confirmed at:', signupBody.email_confirmed_at);
  console.log('User role:', signupBody.role);
  console.log('Identities:', JSON.stringify(signupBody.identities, null, 2));
  
  // Now try to login with this freshly created user
  console.log('\n--- Try login with fresh user ---');
  const loginResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: 'diagnosetest_xyz_delete@shubhlabh.local', password: 'Diagnose123!' })
  });
  const loginBody = await loginResp.json();
  console.log('Login status:', loginResp.status);
  if (loginBody.access_token) {
    console.log('LOGIN WORKS for fresh signup-created user');
    // Delete the test user via the supabase SDK admin
  } else {
    console.log('Login response:', JSON.stringify(loginBody));
  }
} else {
  console.log('Signup failed/blocked (probably email confirm required):', JSON.stringify(signupBody));
}

// Compare: try babulal login again to see exact error id 
console.log('\n=== Babulal login attempt (for error ID) ===');
const babResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
  body: JSON.stringify({ email: 'babulal@shubhlabh.com', password: 'password' })
});
const babBody = await babResp.json();
console.log('Babulal login status:', babResp.status);
console.log('Babulal error:', JSON.stringify(babBody));
