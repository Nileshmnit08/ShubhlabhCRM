const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fwkjddflpzkowlawkmka.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q');
supabase.from('crm_parties').select('*').limit(1).then(r => console.log(Object.keys(r.data[0])));
