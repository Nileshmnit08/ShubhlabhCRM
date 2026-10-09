const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('raw_material_price_entries')
    .select('price, remarks, entry_date, raw_materials(name_en)')
    .order('created_at', { ascending: false })
    .limit(15);
  
  if (error) console.error(error);
  else console.log(data);
}

check();
