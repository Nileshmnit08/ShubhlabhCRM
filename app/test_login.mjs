import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://fwkjddflpzkowlawkmka.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q');

async function test(email, password) {
  console.log(`\nTesting ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.log(`status: ${error.status}`);
    console.log(`code: ${error.code}`);
    console.log(`message: ${error.message}`);
    console.log(`name: ${error.name}`);
    console.log('error object:', JSON.stringify(error));
  } else {
    console.log('SUCCESS!');
  }
}

async function run() {
  await test('test@shubhlabh.com', 'password');
  await test('test@shubhlabh.com', 'invalid_password');
}
run();
