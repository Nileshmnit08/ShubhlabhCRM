const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient('https://fwkjddflpzkowlawkmka.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q');

async function runMigration() {
  const sql = fs.readFileSync('D:/ShubhLabhCRM/150_sprint_FM_01_field_sessions.sql', 'utf8');
  
  // Try to use a raw query if RPC or POST isn't available
  // The anon key won't have permission to execute DDL directly unless we use an exec_sql rpc.
  // We can try calling 'exec_sql' if it exists.
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
  if (error) {
    console.error("Migration failed:", error);
  } else {
    console.log("Migration succeeded:", data);
  }
}

runMigration();
