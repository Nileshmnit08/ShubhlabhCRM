import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
global.WebSocket = ws;
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runValidation() {
  console.log("Starting Phase 12 Intelligence Validation...\n");

  // Fetch a sample of customers (we know crm_parties is accessible via Anon Key from MS 12.1)
  const { data: customers, error: cErr } = await supabase
    .from('crm_parties')
    .select('*')
    .limit(5);

  if (cErr) {
    console.error("Error fetching customers:", cErr);
    return;
  }
  
  if (!customers || customers.length === 0) {
    console.log("No customers found to validate.");
    return;
  }

  for (const customer of customers) {
    console.log(`\n===========================================`);
    console.log(`Validating Customer: ${customer.display_name} (ID: ${customer.id})`);
    console.log(`CRM Status: ${customer.crm_status}`);
    console.log(`===========================================`);

    // 1. Fetch Interactions (Activity Intelligence)
    const { data: interactions } = await supabase.from('interactions').select('*').eq('party_id', customer.id);
    let lastInteraction = null;
    if (interactions && interactions.length > 0) {
      lastInteraction = interactions.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
      const daysSince = Math.floor((new Date() - new Date(lastInteraction.created_at)) / (1000 * 60 * 60 * 24));
      console.log(`- Activity Intelligence: ${interactions.length} total interactions. Last: ${daysSince} days ago.`);
    } else {
      console.log(`- Activity Intelligence: No Contact History.`);
    }

    // 2. Fetch Requirements (Pipeline & Demand)
    const { data: requirements } = await supabase.from('requirements').select('*').eq('party_id', customer.id);
    if (requirements && requirements.length > 0) {
      const openReqs = requirements.filter(r => r.status === 'Open');
      console.log(`- Pipeline Intelligence: ${requirements.length} total, ${openReqs.length} open requirements.`);
    } else {
      console.log(`- Pipeline Intelligence: No requirements.`);
    }

    // 3. Fetch Follow-ups (Risk & Reactivation)
    const { data: followUps } = await supabase.from('follow_ups').select('*').eq('party_id', customer.id);
    if (followUps && followUps.length > 0) {
      const overdue = followUps.filter(f => f.status === 'Pending' && new Date(f.due_at) < new Date());
      console.log(`- Risk Intelligence: ${followUps.length} follow-ups, ${overdue.length} overdue.`);
    } else {
      console.log(`- Risk Intelligence: No follow-ups.`);
    }

    // 4. Fetch Tally Transactions (Purchase Behaviour) - Might be blocked by RLS
    const { data: transactions, error: tErr } = await supabase.from('tally_transactions').select('*').eq('crm_party_id', customer.id);
    if (tErr) {
      console.log(`- Purchase Behaviour: Blocked by RLS (${tErr.message})`);
    } else if (transactions && transactions.length > 0) {
      const sales = transactions.filter(t => t.is_credit === false);
      console.log(`- Purchase Behaviour: ${sales.length} sales vouchers found.`);
    } else {
      console.log(`- Purchase Behaviour: No Purchase History.`);
    }
  }

  console.log(`\n\n--- Validation Complete ---`);
  console.log(`Note: Since views (DDL) cannot be created, logic was evaluated programmatically against raw tables to verify data relationships.`);
}

runValidation().catch(console.error);
