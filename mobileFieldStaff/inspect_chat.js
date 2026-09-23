const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) {
    envVars[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  }
});

const supabaseUrl = envVars['EXPO_PUBLIC_SUPABASE_URL'] || envVars['SUPABASE_URL'];
const supabaseKey = envVars['EXPO_PUBLIC_SUPABASE_ANON_KEY'] || envVars['SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  try {
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(1);

    if (msgError) console.error('Error fetching chat_messages:', msgError);
    else console.log('Columns in chat_messages:', messages.length > 0 ? Object.keys(messages[0]) : 'No messages found');

    const { data: convs, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .limit(1);
    
    if (convError) console.error('Error fetching chat_conversations:', convError);
    else console.log('Columns in chat_conversations:', convs.length > 0 ? Object.keys(convs[0]) : 'No convs found');

    const { data: parts, error: partError } = await supabase
      .from('chat_participants')
      .select('*')
      .limit(1);
    
    if (partError) console.error('Error fetching chat_participants:', partError);
    else console.log('Columns in chat_participants:', parts.length > 0 ? Object.keys(parts[0]) : 'No parts found');
  } catch(e) {
    console.error(e);
  }
}

inspectSchema();
