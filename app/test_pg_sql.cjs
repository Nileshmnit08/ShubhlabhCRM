const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  const sql = fs.readFileSync('D:/ShubhLabhCRM/231_sprint_MARKET_PRICES.sql', 'utf8');
  try {
    await client.query(sql);
    console.log("SQL executed successfully!");
  } catch (err) {
    console.error("SQL Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
