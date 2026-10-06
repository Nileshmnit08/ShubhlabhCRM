import { createClient } from '@supabase/supabase-js';

// Use service role key from the CRM .env to inspect auth.users
// Reading it from the CRM's existing environment
import fs from 'fs';

const envStr = fs.readFileSync('D:/ShubhLabhCRM/mobileFieldStaff/.env', 'utf-8');
const urlMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envStr.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabaseUrl = urlMatch?.[1]?.trim().replace(/['"]/g, '') || 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseKey = keyMatch?.[1]?.trim().replace(/['"]/g, '');

console.log('URL:', supabaseUrl);
console.log('Key prefix:', supabaseKey?.substring(0, 20) + '...');

// Also try to get service role key from app/.env
let serviceKey = null;
try {
  const appEnv = fs.readFileSync('D:/ShubhLabhCRM/app/.env', 'utf-8');
  const svcMatch = appEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
  if (svcMatch) serviceKey = svcMatch[1].trim().replace(/['"]/g, '');
} catch (e) {}

try {
  const appEnv2 = fs.readFileSync('D:/ShubhLabhCRM/.env', 'utf-8');
  const svcMatch = appEnv2.match(/SERVICE_ROLE_KEY=(.*)/i);
  if (svcMatch && !serviceKey) serviceKey = svcMatch[1].trim().replace(/['"]/g, '');
  const svcMatch2 = appEnv2.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/i);
  if (svcMatch2 && !serviceKey) serviceKey = svcMatch2[1].trim().replace(/['"]/g, '');
} catch (e) {}

console.log('Service key found:', serviceKey ? 'YES (first 20: ' + serviceKey.substring(0, 20) + '...)' : 'NO');

// Test 1: check connectivity to the exact Supabase URL
console.log('\n--- Connectivity test ---');
try {
  const r = await fetch(`${supabaseUrl}/rest/v1/`, { headers: { apikey: supabaseKey } });
  console.log('REST API status:', r.status);
} catch (e) {
  console.log('REST API NETWORK ERROR:', e.message);
}

// Test 2: auth health endpoint
try {
  const r2 = await fetch(`${supabaseUrl}/auth/v1/health`);
  const body = await r2.json();
  console.log('Auth health:', r2.status, JSON.stringify(body));
} catch (e) {
  console.log('Auth health ERROR:', e.message);
}

// Test 3: Try login with a known VALID CRM admin account
// (just to see if it's only babulal or all users that fail)
console.log('\n--- TEST: Does ANY login work on this Supabase project? ---');
const testResp = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: supabaseKey },
  body: JSON.stringify({ email: 'test_nonexistent_check@nowhere.invalid', password: 'wrongpassword' })
});
const testBody = await testResp.json();
console.log('Nonexistent user status:', testResp.status);
console.log('Nonexistent user response:', JSON.stringify(testBody));
