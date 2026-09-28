import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fwkjddflpzkowlawkmka.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q'
);

async function testSchema() {
  const { data, error } = await supabase
    .from('chat_conversations')
    .update({ metadata: { test: 1 } })
    .eq('id', '00000000-0000-0000-0000-000000000000') // fake id
    .select();
  
  if (error) {
    console.error("Update failed:", error.message);
  } else {
    console.log("Update succeeded or zero rows affected (column exists!)");
  }
}
testSchema();
