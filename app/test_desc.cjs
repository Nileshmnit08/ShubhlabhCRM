const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  console.log("Checking for ANY undefined descriptions in vw_field_timeline");
  const { data: events, error } = await supabase.from('vw_field_timeline').select('*');
  if (error) console.error(error);
  
  let crashFound = false;
  events.forEach(evt => {
    if (evt.event_type === 'VISIT') {
      if (evt.description === undefined || evt.description === null) {
        console.log(`Crash candidate! Null description for visit event ${evt.id}`);
        crashFound = true;
      }
    }
  });
  
  if (!crashFound) {
    console.log("No null descriptions found.");
  }
}
run();
