const fs = require('fs');
let code = fs.readFileSync('src/services/WhatsAppService.js', 'utf8');

// Strip out imports and change export to const
code = code.replace(/import.*?;\n/g, '');
code = code.replace('export const WhatsAppService', 'const WhatsAppService');

const mockScript = `
let lastUrl = '';
let lastAlert = null;
const Linking = {
  canOpenURL: async (url) => true,
  openURL: async (url) => { lastUrl = url; }
};
const Alert = {
  alert: (title, msg) => { lastAlert = {title, msg}; console.log('ALERT:', title, msg); }
};
const supabase = {
  from: () => ({
    select: () => ({
      eq: (col, val) => ({
        single: async () => {
          if (val === 'VALID_ID') return { data: { mobile: '9876543210', display_name: 'Test Customer' } };
          if (val === 'INVALID_PHONE_ID') return { data: { mobile: '123' } }; // will be 123
          if (val === 'MISSING_PHONE_ID') return { data: {} };
          return { error: new Error('Not found') };
        }
      })
    })
  })
};

const formatDateFull = (date) => new Date(date).toISOString().substring(0, 10);

${code}

async function runTests() {
  console.log('--- TEST A: Direct Order ---');
  lastUrl = ''; lastAlert = null;
  await WhatsAppService.shareOrder(
    { id: 'ORD123456789', party_id: 'VALID_ID', created_at: new Date().toISOString() },
    [{ category: 'Mix', product_name: 'Dry Mix (50 kg)', quantity: 20, unit: 'Bags' }]
  );
  console.log('Test A URL:', decodeURIComponent(lastUrl));

  console.log('\\n--- TEST B: Multi-product Order ---');
  lastUrl = ''; lastAlert = null;
  await WhatsAppService.shareOrder(
    { id: 'ORD999', party_id: 'VALID_ID', created_at: new Date().toISOString() },
    [
      { category: 'Mix', product_name: 'Dry Mix (50 kg)', quantity: 20, unit: 'Bags' },
      { category: 'Oil', product_name: 'Mustard Oil (15 kg)', quantity: 10, unit: 'Bags', weight: 15 } // testing direct weight vs parsed
    ]
  );
  console.log('Test B URL:', decodeURIComponent(lastUrl));

  console.log('\\n--- TEST C: Missing phone ---');
  lastUrl = ''; lastAlert = null;
  await WhatsAppService.shareOrder(
    { id: 'ORD123456789', party_id: 'MISSING_PHONE_ID', created_at: new Date().toISOString() },
    []
  );

  console.log('\\n--- TEST D: Invalid phone (short) ---');
  lastUrl = ''; lastAlert = null;
  await WhatsAppService.shareOrder(
    { id: 'ORD123456789', party_id: 'INVALID_PHONE_ID', created_at: new Date().toISOString() },
    []
  );
  console.log('Test D URL:', decodeURIComponent(lastUrl));
}
runTests();
`;

fs.writeFileSync('dry_test.cjs', mockScript);
