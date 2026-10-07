const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const code = fs.readFileSync('src/core/api/supabase.js', 'utf8');
const urlMatch = code.match(/supabaseUrl\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = code.match(/supabaseAnonKey\s*=\s*['"]([^'"]+)['"]/);
if(urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  supabase.from('buyer_orders').select('*').limit(1)
    .then(res => console.log('SUCCESS:', JSON.stringify(res, null, 2)))
    .catch(err => console.log('CATCH ERROR:', err));
}
