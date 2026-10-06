import { createClient } from '@supabase/supabase-js';

const validKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';
const keyWithCr = validKey + '\r';

const supValid = createClient('https://fwkjddflpzkowlawkmka.supabase.co', validKey);
const supCr = createClient('https://fwkjddflpzkowlawkmka.supabase.co', keyWithCr);

async function test(sup, name) {
  console.log(`\nTesting ${name}...`);
  const { error } = await sup.auth.signInWithPassword({ email: 'fakeuser12345@shubhlabh.com', password: 'password123' });
  if (error) {
    console.log(`[${name}] error: ${error.status} - ${error.message}`);
  } else {
    console.log(`[${name}] SUCCESS`);
  }
}

async function run() {
  await test(supValid, "Valid Key");
  await test(supCr, "Key with CR");
}
run();
