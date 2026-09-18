const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'nitesh@shubhlabh.com',
    password: 'password'
  });
  
  if (!authData.user) {
    console.error('Failed to log in');
    return;
  }
  
  console.log('--- 1. CHECK MIGRATION STATUS ---');
  const views = [
    'v_repeated_communication_summary',
    'v_staff_communication_summary',
    'v_customer_communication_summary',
    'v_unknown_communication_summary'
  ];

  let applied = true;
  for (const view of views) {
    const { error } = await supabase.from(view).select('*').limit(1);
    if (error && error.code === '42P01') {
      console.log(`View ${view} does NOT exist. Migration not applied.`);
      applied = false;
    } else if (error) {
      console.log(`View ${view} query failed with code: ${error.code} msg: ${error.message}`);
    } else {
      console.log(`View ${view} exists.`);
    }
  }

  if (!applied) {
     console.log('\nMIGRATION NOT APPLIED. Aborting further checks.');
     return;
  }

  console.log('\n--- 2. VERIFY SCHEMA AND COLUMN CONTRACT ---');
  for (const view of views) {
      const { data, error } = await supabase.from(view).select('*').limit(1);
      if (!error && data) {
         console.log(`${view} columns returned in response:`, data.length > 0 ? Object.keys(data[0]) : 'No data, columns unavailable via API (requires psql)');
      }
  }

  console.log('\n--- 3. DATA INVENTORY (crm_call_events) ---');
  const { count: totalEvents } = await supabase.from('crm_call_events').select('*', { count: 'exact', head: true });
  console.log(`Total events: ${totalEvents}`);
  
  // Try to fetch different kinds of events to use for our test cases
  const { data: sampleEvents } = await supabase.from('crm_call_events').select('*').limit(100);
  
  const knownCustomerEvent = sampleEvents.find(e => e.party_id !== null && e.match_status === 'matched');
  const unknownNumberEvent = sampleEvents.find(e => e.party_id === null && e.match_status === 'unknown');
  const ambiguousNumberEvent = sampleEvents.find(e => e.party_id === null && e.match_status === 'ambiguous');
  const incomingAnsweredEvent = sampleEvents.find(e => e.direction === 'INCOMING' && e.call_type === 'ANSWERED');
  const outgoingAnsweredEvent = sampleEvents.find(e => e.direction === 'OUTGOING' && e.call_type === 'ANSWERED');
  const missedEvent = sampleEvents.find(e => e.call_type === 'MISSED');
  
  // We will run queries against the views to see if they accurately reflect the real data
  console.log('\n--- CASE A: KNOWN CUSTOMER ---');
  if (knownCustomerEvent) {
      const reportingDate = knownCustomerEvent.started_at.substring(0, 10);
      const { data: staffSummaryData } = await supabase.from('v_staff_communication_summary')
           .select('known_customer_calls')
           .eq('staff_id', knownCustomerEvent.staff_id)
           .eq('reporting_date', reportingDate);
           
      const { data: customerSummaryData } = await supabase.from('v_customer_communication_summary')
           .select('total_calls, incoming_calls, outgoing_calls')
           .eq('party_id', knownCustomerEvent.party_id);
           
      console.log('Known customer event found. Staff summary known count:', staffSummaryData);
      console.log('Customer summary totals:', customerSummaryData);
  } else {
      console.log('No known customer events found to test Case A.');
  }
  
  console.log('\n--- CASE B: UNKNOWN NUMBER ---');
  if (unknownNumberEvent) {
      const reportingDate = unknownNumberEvent.started_at.substring(0, 10);
      const { data: staffSummaryData } = await supabase.from('v_staff_communication_summary')
           .select('unknown_calls')
           .eq('staff_id', unknownNumberEvent.staff_id)
           .eq('reporting_date', reportingDate);
           
      const { data: unknownSummaryData } = await supabase.from('v_unknown_communication_summary')
           .select('masked_phone, total_calls')
           .eq('normalized_phone', unknownNumberEvent.normalized_phone);
           
      console.log('Unknown event found. Staff summary unknown count:', staffSummaryData);
      console.log('Unknown summary masked phone and total:', unknownSummaryData);
  } else {
      console.log('No unknown events found to test Case B.');
  }
  
  console.log('\n--- CASE C: AMBIGUOUS NUMBER ---');
  if (ambiguousNumberEvent) {
      const reportingDate = ambiguousNumberEvent.started_at.substring(0, 10);
      const { data: staffSummaryData } = await supabase.from('v_staff_communication_summary')
           .select('ambiguous_calls')
           .eq('staff_id', ambiguousNumberEvent.staff_id)
           .eq('reporting_date', reportingDate);
           
      console.log('Ambiguous event found. Staff summary ambiguous count:', staffSummaryData);
  } else {
      console.log('No ambiguous events found to test Case C.');
  }

  // Find a repeated combination
  const { data: repeatedTest } = await supabase.from('v_repeated_communication_summary').select('*').limit(1);
  console.log('\n--- CASE D: REPEATED COMMUNICATION ---');
  if (repeatedTest && repeatedTest.length > 0) {
      console.log('Found a repeated communication record in view:', repeatedTest[0]);
  } else {
      console.log('No repeated communication data found.');
  }

  console.log('\n--- FINISHED ---');
}

runTests();
