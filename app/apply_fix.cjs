const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Test!1234@db.fwkjddflpzkowlawkmka.supabase.co:5432/postgres'
  });
  
  await client.connect();
  const sql = fs.readFileSync('D:/ShubhLabhCRM/fix_board_requirements.sql', 'utf8');
  try {
    await client.query(sql);
    console.log("SQL fix executed successfully!");
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
