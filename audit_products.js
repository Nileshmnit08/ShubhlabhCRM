const { Client } = require('pg');

async function runAudit() {
  const connectionString = 'postgresql://postgres.fwkjddflpzkowlawkmka:C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Check table existence and columns
    let res = await client.query(`
      SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'products';
    `);
    console.log('--- COLUMNS ---');
    console.table(res.rows);

    // Check constraints (PK, UNIQUE, FK, CHECK)
    res = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'products';
    `);
    console.log('\n--- CONSTRAINTS ---');
    console.table(res.rows);

    // Check indexes
    res = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'products';
    `);
    console.log('\n--- INDEXES ---');
    console.table(res.rows);

    // Check RLS status
    res = await client.query(`
      SELECT relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname = 'products' AND relnamespace = 'public'::regnamespace;
    `);
    console.log('\n--- RLS ENABLED ---');
    console.table(res.rows);

    // Check RLS policies
    res = await client.query(`
      SELECT polname, polpermissive, polroles, polcmd, polqual, polwithcheck
      FROM pg_policy
      WHERE polrelid = 'public.products'::regclass;
    `);
    console.log('\n--- RLS POLICIES ---');
    console.table(res.rows);

    // Check row count
    res = await client.query(`SELECT COUNT(*) FROM public.products;`);
    console.log('\n--- ROW COUNT ---');
    console.log(res.rows[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

runAudit();
