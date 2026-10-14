import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const email = 'admin@shubhlabh.com';
  const passwords = ['password', 'admin', 'admin123', 'Admin@123', 'ShubhLabh@123', '123456', '12345678'];
  
  console.log(`Checking login for ${email}...`);
  for (const pw of passwords) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) {
      console.log(`Password "${pw}": ${error.status} ${error.message}`);
    } else {
      console.log(`SUCCESS with password "${pw}"! User:`, data.user.id, data.user.email);
      // check app_users
      const { data: profile, error: profErr } = await supabase.from('app_users').select('*').eq('id', data.user.id).single();
      console.log('Profile:', profile, 'Profile error:', profErr);
      return;
    }
  }
}

check();
