const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectCatalogueAndNotifications() {
  console.log('--- 1. Querying all 31 products from CRM products table ---');
  const { data: prods, error: pErr } = await supabase.from('products').select('*');
  if (pErr) console.error('Error fetching products:', pErr);
  else {
    console.log(`Found ${prods.length} products:`);
    prods.forEach(p => console.log(` - ID: ${p.id} | Name: "${p.name}" | Category: "${p.category}" | Active: ${p.active} | BagFactor: ${p.bag_conversion_factor} | Unit: ${p.unit_of_measure}`));
  }

  console.log('\n--- 2. Querying website_product_categories ---');
  const { data: cats, error: cErr } = await supabase.from('website_product_categories').select('*');
  if (cErr) console.error('Error fetching website categories:', cErr);
  else {
    console.log(`Found ${cats.length} website categories:`);
    cats.forEach(c => console.log(` - ID: ${c.id} | Name: "${c.name}" | Slug: "${c.slug}" | Badge: "${c.category_badge}" | Order: ${c.display_order}`));
  }

  console.log('\n--- 3. Querying website_products ---');
  const { data: webProds, error: wpErr } = await supabase.from('website_products').select('*');
  if (wpErr) console.error('Error fetching website products:', wpErr);
  else {
    console.log(`Found ${webProds.length} website products:`);
    webProds.forEach(p => console.log(` - ID: ${p.id} | CatID: ${p.category_id} | Name: "${p.name}" | Slug: "${p.slug}" | Status: "${p.status}" | Packaging: "${p.packaging_desc}"`));
  }

  console.log('\n--- 4. Authenticating as Admin to inspect crm_notifications columns and crm_parties RLS ---');
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'admin@shubhlabh.com',
    password: 'password'
  });

  const { data: notifData, error: notifErr } = await supabase.from('crm_notifications').select('*').limit(1);
  if (notifErr) console.error('Error fetching crm_notifications:', notifErr);
  else {
    console.log('crm_notifications response:', notifData);
  }

  // Check RLS on crm_parties: can anon insert? can anon update?
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: insertCheck, error: insertErr } = await anonClient.from('crm_parties').insert({
    display_name: 'TEST_PROBE_ANON',
    mobile: '9999999999'
  });
  console.log('Anon INSERT into crm_parties result:', insertErr ? `BLOCKED (${insertErr.code}: ${insertErr.message})` : 'ALLOWED (SECURITY CONCERN)');
}

inspectCatalogueAndNotifications().catch(console.error);
