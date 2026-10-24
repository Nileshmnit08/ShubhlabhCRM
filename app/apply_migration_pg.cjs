const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  const sql = fs.readFileSync('D:/ShubhLabhCRM/234_sprint_FM_04_segment_engine_rls_fix.sql', 'utf8');
  try {
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
