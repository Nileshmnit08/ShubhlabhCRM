const fs = require('fs');

async function checkTable(tableName) {
  const url = `https://fwkjddflpzkowlawkmka.supabase.co/rest/v1/${tableName}?select=*&limit=1`;
  const options = {
    method: 'GET',
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q'
    }
  };
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
        console.log(`Table ${tableName}: ERROR ${res.status} - ${await res.text()}`);
        return null;
    }
    const data = await res.json();
    console.log(`Table ${tableName}: SUCCESS. Row count: ${data.length}`);
    if (data.length > 0) {
        console.log(data[0]);
    }
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function run() {
  await checkTable('requirements');
  await checkTable('requirement_items');
  await checkTable('buyer_orders');
  await checkTable('buyer_order_items');
  await checkTable('products');
}

run();
