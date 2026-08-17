import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Starting seed process...");

  // 1. Get or create some dummy parties
  let { data: parties, error: pErr } = await supabase.from('crm_parties').select('id').limit(3);
  
  if (pErr) {
    console.error("Error fetching parties:", pErr);
    return;
  }
  
  if (!parties || parties.length === 0) {
    console.log("No parties found. Creating dummy parties...");
    const { data: newParties, error: newPErr } = await supabase.from('crm_parties').insert([
      { display_name: 'Shree Ganesh Feeds', mobile: '9876543210', whatsapp: '9876543210', crm_status: 'Active', city: 'Pune' },
      { display_name: 'AgriTech Farms', mobile: '9123456789', crm_status: 'Active', city: 'Nashik' },
      { display_name: 'Deshmukh Dairy (OLD)', mobile: '9000000000', crm_status: 'Dormant', city: 'Satara' }
    ]).select();
    
    if (newPErr) {
      console.error("Error creating parties:", newPErr);
      return;
    }
    parties = newParties;
  }
  
  const party1 = parties[0].id;
  const party2 = parties.length > 1 ? parties[1].id : parties[0].id;

  console.log("Seeding interactions...");
  // 2. Add interactions
  await supabase.from('interactions').insert([
    { party_id: party1, channel: 'Call', outcome: 'Discussed new feed rates', note: 'Customer is happy with the pricing.' },
    { party_id: party1, channel: 'WhatsApp', outcome: 'Sent catalog', note: 'Waiting for them to read.' },
    { party_id: party2, channel: 'Meeting', outcome: 'Visited farm', note: 'Cows are healthy, looking to increase order.' }
  ]);
  
  console.log("Seeding follow-ups...");
  // 3. Add follow ups
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  await supabase.from('follow_ups').insert([
    { 
      party_id: party1, 
      reason: 'Follow up on PDF catalog sent', 
      follow_up_date: today.toISOString().split('T')[0], 
      priority: 'High', 
      status: 'Pending',
      notes: 'Ensure we get a yes/no on the premium mix.'
    },
    { 
      party_id: party2, 
      reason: 'Call regarding overdue payment', 
      follow_up_date: yesterday.toISOString().split('T')[0], 
      priority: 'High', 
      status: 'Pending' 
    },
    { 
      party_id: party1, 
      reason: 'Check next week feed requirement', 
      follow_up_date: today.toISOString().split('T')[0], 
      priority: 'Normal', 
      status: 'Pending' 
    }
  ]);

  console.log("Seeding complete! Check your Today's Work dashboard.");
}

seed();
