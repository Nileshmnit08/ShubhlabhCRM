const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.fwkjddflpzkowlawkmka:Test!1234@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
  });
  
  await client.connect();
  try {
    const res1 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'raw_materials';
    `);
    console.log("raw_materials columns:", res1.rows);
    
    const res2 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'raw_material_price_entries';
    `);
    console.log("raw_material_price_entries columns:", res2.rows);

    const res3 = await client.query(`SELECT * FROM raw_materials LIMIT 10;`);
    console.log("raw_materials data:", res3.rows);
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
