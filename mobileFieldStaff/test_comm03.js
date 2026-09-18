const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'nitesh@shubhlabh.com',
    password: 'password'
  });
  
  const userId = authData.user.id;

  console.log('--- 2. TEST normalize_phone() ---');
  const testInputs = [
    '+919876543210',
    '919876543210',
    '09876543210',
    '9876543210',
    '+91 987 654 3210',
    '98-765-43210',
    null,
    '',
    '123'
  ];
  
  for (const input of testInputs) {
    const { data, error } = await supabase.rpc('normalize_phone', { raw_phone: input });
    console.log(`Input: "${input}" -> Result:`, error ? error.message : data);
  }

  console.log('\n--- 3. FIND REAL KNOWN CUSTOMER NUMBERS ---');
  // Since we are logged in as Nitesh, we can fetch customers he has access to
  const { data: customers } = await supabase
    .from('crm_parties')
    .select('id, display_name, mobile, whatsapp')
    .not('mobile', 'is', null)
    .limit(50);
  
  let validPhoneToTest = null;
  let testCustomer = null;

  for (const c of customers) {
    if (!c.mobile) continue;
    // Let's normalize it on our own to test the RPC match
    const norm = await supabase.rpc('normalize_phone', { raw_phone: c.mobile });
    if (norm.data) {
       // verify if it is an exact match
       const { data: matchTest } = await supabase.rpc('match_customer_by_phone', { call_norm_phone: norm.data });
       if (matchTest && matchTest.length > 0 && matchTest[0].status === 'matched') {
          validPhoneToTest = norm.data;
          testCustomer = c;
          break;
       }
    }
  }

  if (testCustomer) {
    console.log(`Found real customer (ID: ${testCustomer.id}) for match testing. Phone masked: ${validPhoneToTest.substring(0, 4)}*****${validPhoneToTest.substring(9)}`);
  } else {
    console.log('Could not find a unique customer for match testing in the first 50 results.');
  }

  console.log('\n--- 4. TEST KNOWN CUSTOMER MATCH ---');
  if (validPhoneToTest) {
    const { data: matchResult } = await supabase.rpc('match_customer_by_phone', { call_norm_phone: validPhoneToTest });
    console.log(`Matching ${validPhoneToTest.substring(0, 4)}*****${validPhoneToTest.substring(9)}:`, matchResult);
  }

  console.log('\n--- 5. TEST UNKNOWN NUMBER ---');
  const { data: unkResult } = await supabase.rpc('match_customer_by_phone', { call_norm_phone: '910000000000' });
  console.log('Matching 910000000000:', unkResult);

  console.log('\n--- 6. TEST AMBIGUOUS NUMBER ---');
  const { data: ambResult } = await supabase.rpc('match_customer_by_phone', { call_norm_phone: '919352276227' });
  console.log('Matching 919352276227:', ambResult);

  console.log('\n--- 7 & 8. TEST ACTUAL crm_call_events ---');
  const { data: events, error: eventErr } = await supabase
    .from('crm_call_events')
    .select('id, party_id, match_status, normalized_phone, staff_id')
    .eq('staff_id', userId);

  if (eventErr) {
    console.log('Error fetching call events:', eventErr.message);
  } else {
    console.log(`Total call events for Nitesh: ${events.length}`);
    const withParty = events.filter(e => e.party_id !== null).length;
    const matched = events.filter(e => e.match_status === 'matched').length;
    const unknown = events.filter(e => e.match_status === 'unknown').length;
    const ambiguous = events.filter(e => e.match_status === 'ambiguous').length;
    const nullPartyIdWithMatched = events.filter(e => e.match_status === 'matched' && e.party_id === null).length;
    
    console.log(`With party_id: ${withParty}`);
    console.log(`match_status = matched: ${matched}`);
    console.log(`match_status = unknown: ${unknown}`);
    console.log(`match_status = ambiguous: ${ambiguous}`);
    if (nullPartyIdWithMatched > 0) {
       console.log(`WARNING: Found ${nullPartyIdWithMatched} events with match_status='matched' but party_id is NULL.`);
    }
  }

}

runTests();
