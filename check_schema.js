const { Client } = require('pg');

async function checkSchema() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Check products schema
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'products';
    `);
    
    console.log('PRODUCTS SCHEMA:');
    console.log(res.rows);

    // Get a sample of products
    const res2 = await client.query(`SELECT * FROM public.products LIMIT 5;`);
    console.log('\nSAMPLE PRODUCTS:');
    console.log(res2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSchema();
