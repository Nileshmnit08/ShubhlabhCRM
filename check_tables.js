const supabaseUrl = 'https://fwkjddflpzkowlawkmka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';

async function checkTables() {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const spec = await res.json();
  const tables = Object.keys(spec.definitions);
  console.log(tables.filter(t => t.toLowerCase().includes('prod') || t.toLowerCase().includes('item') || t.toLowerCase().includes('price') || t.toLowerCase().includes('scheme')));
}

checkTables();
