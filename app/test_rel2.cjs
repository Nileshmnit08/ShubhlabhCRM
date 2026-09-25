const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('../mobile/.env', 'utf8');
const urlMatch = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
supabase.from('v_board_requirements').select('*, requirement_items(*)').limit(1).then(res => console.log(JSON.stringify(res, null, 2)));
