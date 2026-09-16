const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fwkjddflpzkowlawkmka.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q'
);

async function testSignUp() {
  console.log('Attempting sign up...');
  const { data, error } = await supabase.auth.signUp({
    email: 'pradeep@shubhlabh.com',
    password: 'password',
    options: {
      data: {
        full_name: 'Pradeep Kumar'
      }
    }
  });
  
  if (error) {
    console.log('Sign up error:', error.message);
  } else {
    console.log('Sign up successful:', data.user?.id);
  }
}

testSignUp();
