import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwkjddflpzkowlawkmka.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3a2pkZGZscHprb3dsYXdrbWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk1NDg2OSwiZXhwIjoyMTAyNTMwODY5fQ.FYHMjv5x4X3uxV0A6n5N2dqoYB1pNkK72Zn881f13iw';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const supabaseAuth = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { db: { schema: 'auth' } });

async function run() {
  const emails = ['test@shubhlabh.com', 'babulal@shubhlabh.com'];
  
  // 1. auth.users / auth.identities
  console.log('=== AUTH.USERS (via PostgREST) ===');
  const { data: usersData, error: usersErr } = await supabaseAuth
    .from('users')
    .select('id, email, created_at, updated_at, email_confirmed_at, aud, role, is_sso_user, raw_app_meta_data, raw_user_meta_data')
    .in('email', emails);
    
  if (usersErr) {
    console.log('Error fetching auth.users via PostgREST:', usersErr.message);
  } else {
    console.log(JSON.stringify(usersData, null, 2));
  }
  
  console.log('\n=== AUTH.IDENTITIES (via PostgREST) ===');
  if (usersData && usersData.length > 0) {
    const userIds = usersData.map(u => u.id);
    const { data: idsData, error: idsErr } = await supabaseAuth
      .from('identities')
      .select('id, user_id, provider, provider_id, identity_data, created_at, updated_at')
      .in('user_id', userIds);
    if (idsErr) {
      console.log('Error fetching auth.identities:', idsErr.message);
    } else {
      console.log(JSON.stringify(idsData, null, 2));
    }
  }

  // 2. public.app_users
  console.log('\n=== APP_USERS ===');
  const { data: appUsers, error: appUsersErr } = await supabase
    .from('app_users')
    .select('id, email, display_name, role, crm_party_id, is_active')
    .in('email', emails);
  console.log(JSON.stringify(appUsers, null, 2));
  
  // 3. public.crm_parties
  console.log('\n=== CRM_PARTIES ===');
  if (appUsers && appUsers.length > 0) {
    const partyIds = appUsers.map(u => u.crm_party_id).filter(Boolean);
    if (partyIds.length > 0) {
      const { data: crmParties, error: crmErr } = await supabase
        .from('crm_parties')
        .select('id, display_name, crm_status, city')
        .in('id', partyIds);
      console.log(JSON.stringify(crmParties, null, 2));
    } else {
      console.log('No crm_party_ids found in app_users.');
    }
  }
}
run();
