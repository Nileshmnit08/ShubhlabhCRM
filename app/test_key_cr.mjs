import { createClient } from '@supabase/supabase-js';

// Add a carriage return to simulate Windows CRLF parsing issue
const anonKeyWithCr = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q\r';

const supabase = createClient('https://fwkjddflpzkowlawkmka.supabase.co', anonKeyWithCr);

async function run() {
  console.log("Testing with \\r in anon key...");
  const { data, error } = await supabase.auth.signInWithPassword({ email: 'test@shubhlabh.com', password: 'password' });
  if (error) {
    console.log(`status: ${error.status}`);
    console.log(`code: ${error.code}`);
    console.log(`message: ${error.message}`);
    console.log(`name: ${error.name}`);
  } else {
    console.log('SUCCESS!');
  }
}
run();
