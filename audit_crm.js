const { Client } = require('pg');

async function runAudit() {
  const connectionString = 'postgresql://postgres.fwkjddflpzkowlawkmka:C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Check all tables
    let res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('--- ALL TABLES ---');
    console.log(res.rows.map(r => r.table_name));

    // Get requirement table structure
    res = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND (table_name = 'requirements' OR table_name = 'buyer_orders' OR table_name = 'crm_parties');
    `);
    console.log('\n--- COLUMNS IN KEY TABLES ---');
    console.table(res.rows);

    // Look at real requirement data
    res = await client.query(`
      SELECT id, customer_id, party_id, status, created_at, created_by 
      FROM public.requirements 
      LIMIT 1;
    `).catch(() => ({ rows: ['No requirements table'] }));
    console.log('\n--- REQUIREMENTS DATA ---');
    console.log(res.rows);
    
    // Look at real buyer_orders data
    res = await client.query(`
      SELECT id, customer_id, status, created_at 
      FROM public.buyer_orders 
      LIMIT 1;
    `).catch(() => ({ rows: ['No buyer_orders table'] }));
    console.log('\n--- BUYER_ORDERS DATA ---');
    console.log(res.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

runAudit();
