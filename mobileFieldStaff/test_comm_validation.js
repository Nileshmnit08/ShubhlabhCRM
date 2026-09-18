const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function validate() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'vishnu@shubhlabh.com',
    password: 'password'
  });
  
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }

  const { data: profile } = await supabase.from('app_users').select('role, id').eq('id', authData.user.id).single();
  console.log(`Logged in as Vishnu. Role: ${profile.role}`);

  console.log('\n--- 2. OVERALL PRODUCTION DB CALL COUNTS ---');
  let { data: allCalls, error } = await supabase.from('v_crm_call_events_enriched').select('*');
  if (error) {
     console.error('Error fetching v_crm_call_events_enriched:', error);
     return;
  }

  let total = allCalls.length;
  let incoming = allCalls.filter(c => c.direction === 'INCOMING').length;
  let outgoing = allCalls.filter(c => c.direction === 'OUTGOING').length;
  let missed = allCalls.filter(c => c.call_type === 'MISSED').length;
  let unknown = allCalls.filter(c => c.party_id === null).length;

  console.log(`Total Calls: ${total}`);
  console.log(`Incoming: ${incoming}`);
  console.log(`Outgoing: ${outgoing}`);
  console.log(`Missed: ${missed}`);
  console.log(`Unknown: ${unknown}`);

  console.log('\n--- 3. TODAY FILTER (Asia/Kolkata) ---');
  const now = new Date();
  const start = new Date(now); start.setHours(0,0,0,0);
  const end = new Date(now); end.setHours(23,59,59,999);
  
  const isoStart = start.toISOString();
  const isoEnd = end.toISOString();
  console.log(`Timezone Bounds: ${isoStart} to ${isoEnd}`);

  const todayCalls = allCalls.filter(c => c.started_at >= isoStart && c.started_at <= isoEnd);
  
  console.log(`Today Total Calls: ${todayCalls.length}`);
  console.log(`Today Incoming: ${todayCalls.filter(c => c.direction === 'INCOMING').length}`);
  console.log(`Today Outgoing: ${todayCalls.filter(c => c.direction === 'OUTGOING').length}`);
  console.log(`Today Missed: ${todayCalls.filter(c => c.call_type === 'MISSED').length}`);
  
  console.log('\n--- 4. VISHNU STAFF FILTER (ALL TIME) ---');
  const vishnuCalls = allCalls.filter(c => c.staff_id === profile.id);
  console.log(`Vishnu Total Calls: ${vishnuCalls.length}`);
  console.log(`Vishnu Incoming: ${vishnuCalls.filter(c => c.direction === 'INCOMING').length}`);
  console.log(`Vishnu Outgoing: ${vishnuCalls.filter(c => c.direction === 'OUTGOING').length}`);
  console.log(`Vishnu Missed: ${vishnuCalls.filter(c => c.call_type === 'MISSED').length}`);
  
  console.log('\n--- 5. REPRESENTATIVE RECORDS ---');
  const sampleInc = allCalls.find(c => c.direction === 'INCOMING');
  const sampleOut = allCalls.find(c => c.direction === 'OUTGOING');
  const sampleMiss = allCalls.find(c => c.call_type === 'MISSED');
  const sampleUnk = allCalls.find(c => c.party_id === null);
  
  console.log('Incoming:', sampleInc ? {id: sampleInc.id, time: sampleInc.started_at, display_phone: sampleInc.display_phone} : 'None');
  console.log('Outgoing:', sampleOut ? {id: sampleOut.id, time: sampleOut.started_at, display_phone: sampleOut.display_phone} : 'None');
  console.log('Missed:', sampleMiss ? {id: sampleMiss.id, time: sampleMiss.started_at, display_phone: sampleMiss.display_phone} : 'None');
  console.log('Unknown:', sampleUnk ? {id: sampleUnk.id, time: sampleUnk.started_at, display_phone: sampleUnk.display_phone} : 'None');
}
validate();
