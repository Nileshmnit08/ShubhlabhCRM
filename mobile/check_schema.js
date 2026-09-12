const fs = require('fs');
const https = require('https');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const url = env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/';

https.get(url, {
  headers: {
    'apikey': env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
}).on('error', console.error);
