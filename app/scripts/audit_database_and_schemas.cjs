const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runAudit() {
  console.log('====================================================');
  console.log('   SHUBH LABH LIVE SUPABASE DATABASE & SCHEMA AUDIT  ');
  console.log('====================================================\n');

  // List of tables to check
  const candidateTables = [
    // Website CMS tables
    'website_site_settings',
    'website_site_sections',
    'website_product_categories',
    'website_products',
    'website_knowledge_articles',
    'website_navigation_items',
    'website_media_assets',
    'website_public_media_assets',
    'website_audit_logs',
    // New planned tables or variations
    'website_product_subcategories',
    'website_leads',
    'website_contact_enquiries',
    'website_dealer_applications',
    'website_testimonials',
    'website_gallery_items',
    'website_lab_intro',
    'website_lab_equipment',
    'website_lab_capabilities',
    'website_lab_tests',
    // Core CRM tables
    'crm_parties',
    'v_customer_master',
    'crm_notifications',
    'app_users',
    'crm_settings',
    'requirements',
    'follow_ups',
    'products',
    'activity_logs',
    'dispatches'
  ];

  console.log('--- 1. Anonymous Access Check (Public Visitor) ---');
  for (const table of candidateTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(2);

      if (error) {
        console.log(`[ANON] ${table.padEnd(30)}: ERROR (${error.code}) ${error.message}`);
      } else {
        const sampleKeys = data && data[0] ? Object.keys(data[0]).join(', ') : 'no rows';
        console.log(`[ANON] ${table.padEnd(30)}: OK (${data.length} rows fetched, total count: ${count}) -> Cols: [${sampleKeys}]`);
      }
    } catch (e) {
      console.log(`[ANON] ${table.padEnd(30)}: EXCEPTION ${e.message}`);
    }
  }

  console.log('\n--- 2. Authenticated Admin Access Check (admin@shubhlabh.com) ---');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@shubhlabh.com',
    password: 'password'
  });

  if (authError) {
    console.error('Failed to sign in as admin:', authError.message);
    return;
  }

  console.log(`Authenticated as admin: ${authData.user.email} (ID: ${authData.user.id})`);

  for (const table of candidateTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(3);

      if (error) {
        console.log(`[ADMIN] ${table.padEnd(30)}: ERROR (${error.code}) ${error.message}`);
      } else {
        const sampleKeys = data && data[0] ? Object.keys(data[0]).join(', ') : 'no rows';
        console.log(`[ADMIN] ${table.padEnd(30)}: OK (${data.length} rows returned, total count: ${count}) -> Cols: [${sampleKeys}]`);
        if (data.length > 0 && (table.startsWith('website_') || table === 'customers' || table === 'products' || table === 'leads')) {
          console.log(`       Sample row for ${table}:`, JSON.stringify(data[0]).substring(0, 140) + '...');
        }
      }
    } catch (e) {
      console.log(`[ADMIN] ${table.padEnd(30)}: EXCEPTION ${e.message}`);
    }
  }

  // Check RPCs
  console.log('\n--- 3. Database Functions / RPCs Check ---');
  const rpcs = ['is_admin', 'get_user_role'];
  for (const rpc of rpcs) {
    try {
      const { data, error } = await supabase.rpc(rpc);
      if (error) {
        console.log(`RPC ${rpc}: ERROR ${error.message}`);
      } else {
        console.log(`RPC ${rpc}: SUCCESS -> result:`, data);
      }
    } catch (e) {
      console.log(`RPC ${rpc}: EXCEPTION ${e.message}`);
    }
  }
}

runAudit().catch(console.error);
