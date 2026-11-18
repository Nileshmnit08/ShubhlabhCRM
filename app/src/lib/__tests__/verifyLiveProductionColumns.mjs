import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQ4NjksImV4cCI6MjEwMjUzMDg2OX0.C5lDLeWilx9oCJiZND2vZwDcgSMXI13Aexkaab3WE2Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function verifyLiveSchema() {
  const result = await supabase
    .from('requirement_items')
    .select('id, production_done, production_done_at, production_done_by')
    .limit(1);

  if (result.error) {
    return {
      success: false,
      error: result.error,
      code: result.error.code,
      message: result.error.message,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

if (process.argv[1]?.endsWith('verifyLiveProductionColumns.mjs')) {
  verifyLiveSchema().then(res => {
    console.log('LIVE_SCHEMA_VERIFY:', JSON.stringify(res, null, 2));
    if (!res.success) process.exit(1);
  });
}
