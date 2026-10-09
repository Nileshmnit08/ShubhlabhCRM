const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testQuery() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials");
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('v_board_requirements')
    .select('*, requirement_items(*)')
    .limit(5);
    
  if (error) {
    console.error("Query error:", error);
  } else {
    console.log("Query success. Data:", JSON.stringify(data, null, 2));
  }
}

testQuery();
