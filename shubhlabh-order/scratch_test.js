const { createClient } = require('@supabase/supabase-js');
const url = 'https://fwkjddflpzkowlawkmka.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';
const supabase = createClient(url, key);

async function testCols() {
  const cols = ['gift', 'unit', 'weight', 'metadata', 'details', 'extra', 'payload', 'attributes', 'properties', 'data'];
  for (const col of cols) {
    const { error } = await supabase.from('buyer_order_items').select(col).limit(1);
    console.log(col, error ? error.message : 'EXISTS!');
  }
}
testCols();
