import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
global.WebSocket = ws;
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function validatePhase13() {
  console.log("===========================================");
  console.log("PHASE 13 INTELLIGENCE VALIDATION RUN");
  console.log("===========================================\n");

  // 1. Check Opportunity Volume
  const { data: summary, error: sErr } = await supabase.from('v_management_opportunity_summary').select('*');
  if (sErr) console.error("Summary error:", sErr.message);
  else {
    console.log("--- MANAGEMENT SUMMARY (v_management_opportunity_summary) ---");
    console.table(summary);
  }

  // 2. Sample Unactioned Opportunities
  const { data: openOpps, error: oErr } = await supabase.from('v_customer_opportunities').select('*').limit(3);
  if (oErr) console.error("Open Opps error:", oErr.message);
  else {
    console.log("\n--- SAMPLE UNACTIONED OPPORTUNITIES (False Positive Check) ---");
    openOpps.forEach(o => {
      console.log(`Type: ${o.opportunity_type} | Customer: ${o.display_name}`);
      console.log(`Evidence: ${o.evidence}`);
      console.log(`Action: ${o.recommended_action}`);
      console.log("-");
    });
  }

  // 3. Sample Actioned Opportunities (Accepted/Dismissed/Completed)
  const { data: trackOpps, error: tErr } = await supabase.from('v_opportunity_tracking').select('*').limit(5);
  if (tErr) console.error("Tracking error:", tErr.message);
  else {
    console.log("\n--- SAMPLE OPPORTUNITY TRACKING (Outcome Analysis) ---");
    trackOpps.forEach(t => {
      console.log(`Type: ${t.opportunity_type} | Customer: ${t.customer_name} | Action: ${t.initial_action}`);
      console.log(`Status: ${t.current_status} | Final Outcome: ${t.final_outcome || 'N/A'}`);
      console.log("-");
    });
  }
  process.exit(0);
}

validatePhase13().catch(console.error);
