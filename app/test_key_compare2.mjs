import { createClient } from '@supabase/supabase-js';

const validKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';

const supValid = createClient('https://fwkjddflpzkowlawkmka.supabase.co', validKey);

async function test(email, password) {
  console.log(`\nTesting ${email}...`);
  const { error } = await supValid.auth.signInWithPassword({ email, password });
  if (error) {
    console.log(`[${email}] error: ${error.status} - ${error.message}`);
  } else {
    console.log(`[${email}] SUCCESS`);
  }
}

async function run() {
  await test('test@shubhlabh.com', 'password');
}
run();
