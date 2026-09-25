require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

async function test() {
    const { data, error } = await supabase
        .from('requirements')
        .select('*, requirement_items(*)')
        .limit(2);
    console.log(JSON.stringify({data, error}, null, 2));
}

test();
