const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
