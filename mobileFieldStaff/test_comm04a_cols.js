const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns(view, columns) {
  // Query only the requested columns
  const { data, error } = await supabase.from(view).select(columns.join(',')).limit(1);
  if (error) {
     console.log(`[FAILED] ${view} column verification: ${error.message}`);
     return false;
  }
  console.log(`[PASS] ${view} supports columns: ${columns.join(', ')}`);
  return true;
}

async function runTests() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'nitesh@shubhlabh.com',
    password: 'password'
  });
  
  console.log('\n--- VERIFY SCHEMA AND COLUMN CONTRACT ---');
  
  await checkColumns('v_staff_communication_summary', [
    'staff_id',
    'reporting_date',
    'total_calls',
    'answered_calls',
    'missed_calls',
    'incoming_calls',
    'outgoing_calls',
    'total_talk_seconds',
    'known_customer_calls',
    'unknown_calls',
    'ambiguous_calls',
    'customers_contacted',
    'repeated_contacts'
  ]);
  
  await checkColumns('v_customer_communication_summary', [
    'party_id',
    'total_calls',
    'incoming_calls',
    'outgoing_calls',
    'missed_calls',
    'total_talk_seconds',
    'last_call_at',
    'first_call_at',
    'calls_today',
    'calls_last_7_days',
    'calls_last_30_days',
    'distinct_staff_count'
  ]);
  
  await checkColumns('v_unknown_communication_summary', [
    'normalized_phone',
    'masked_phone',
    'total_calls',
    'incoming_calls',
    'outgoing_calls',
    'missed_calls',
    'total_talk_seconds',
    'first_seen_at',
    'last_seen_at',
    'calls_today',
    'calls_last_7_days',
    'calls_last_30_days',
    'distinct_staff_count'
  ]);
  
  await checkColumns('v_repeated_communication_summary', [
    'staff_id',
    'reporting_date',
    'call_count',
    'total_duration_seconds',
    'first_call_at',
    'last_call_at'
  ]);

}

runTests();
