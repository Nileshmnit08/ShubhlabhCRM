const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@db.fwkjddflpzkowlawkmka.supabase.co:5432/postgres');
client.connect().then(() => {
  return client.query(`SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('chat_conversations', 'chat_participants', 'chat_messages')`);
}).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
}).catch(console.error).finally(() => client.end());
