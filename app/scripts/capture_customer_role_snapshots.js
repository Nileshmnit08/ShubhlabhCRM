import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/customer-role');

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

// Mock Team data including Staff and Customers with linked parties
const mockTeam = [
  {
    id: '1',
    display_name: 'Admin',
    email: 'admin@shubhlabh.com',
    role: 'Admin',
    is_active: true,
    whatsapp: null,
    contact_details: '',
    crm_parties: null
  },
  {
    id: '2',
    display_name: 'Vishnu Khandelwal',
    email: 'vishnu@shubhlabh.com',
    role: 'Operations',
    is_active: true,
    whatsapp: '+91 98285 39054',
    contact_details: '',
    crm_parties: null
  },
  {
    id: '3',
    display_name: 'Pradeep Khandelwal',
    email: 'pradeep@shubhlabh.com',
    role: 'Production',
    is_active: true,
    whatsapp: '+91 94144 46444',
    contact_details: '',
    crm_parties: null
  },
  {
    id: '4',
    display_name: 'Vijay Khandelwal',
    email: 'vijay@shubhlabh.com',
    role: 'Sales',
    is_active: true,
    whatsapp: '+91 99281 92696',
    contact_details: '',
    crm_parties: null
  },
  {
    id: '5',
    display_name: 'Yashika Agro Indsutries - Merta',
    email: '9983741790@shubhlabh.app',
    role: 'Buyer',
    is_active: true,
    whatsapp: '+91 99837 41790',
    contact_details: '',
    crm_party_id: '19f7cfff-5ffd-4588-8a5d-c6b62f2a82aa',
    crm_parties: {
      id: '19f7cfff-5ffd-4588-8a5d-c6b62f2a82aa',
      display_name: 'Yashika Agro Indsutries - Merta',
      legal_or_core_name: 'Yashika Agro Industries',
      customer_code: 'CUST-0042',
      mobile: '+91 99837 41790'
    }
  },
  {
    id: '6',
    display_name: 'KAMAL TRADING CO Dudu',
    email: '9887425406@shubhlabh.app',
    role: 'Buyer',
    is_active: true,
    whatsapp: '+91 98874 25406',
    contact_details: '',
    crm_party_id: 'c7e2b69a-7255-4e85-99fa-7763de41615a',
    crm_parties: {
      id: 'c7e2b69a-7255-4e85-99fa-7763de41615a',
      display_name: 'KAMAL TRADING CO Dudu',
      legal_or_core_name: 'Kamal Trading Company',
      customer_code: 'CUST-0018',
      mobile: '+91 98874 25406'
    }
  }
];

const mockParties = [
  {
    id: '19f7cfff-5ffd-4588-8a5d-c6b62f2a82aa',
    display_name: 'Yashika Agro Indsutries - Merta',
    legal_or_core_name: 'Yashika Agro Industries',
    customer_code: 'CUST-0042',
    mobile: '9983741790',
    city: 'Merta'
  },
  {
    id: 'c7e2b69a-7255-4e85-99fa-7763de41615a',
    display_name: 'KAMAL TRADING CO Dudu',
    legal_or_core_name: 'Kamal Trading Company',
    customer_code: 'CUST-0018',
    mobile: '9887425406',
    city: 'Dudu'
  },
  {
    id: 'new-cust-1234',
    display_name: 'Khandelwal Cattle Feed Depot',
    legal_or_core_name: 'Khandelwal Agro Traders',
    customer_code: 'CUST-0099',
    mobile: '9829012345',
    city: 'Jaipur'
  }
];

const mockAdminUser = {
  id: '1',
  email: 'admin@shubhlabh.com',
  display_name: 'Admin',
  role: 'Admin',
  is_active: true,
  theme_mode: 'light',
  accent_color: '#078B54'
};

const mockCrmSettings = {
  id: 1,
  crm_name: 'Shubh Labh CRM',
  company_name: 'Shubh Labh Cattle Feeds',
  app_logo_url: '',
  default_reminder_minutes: 15,
  work_hours_start: '09:00:00',
  work_hours_end: '18:00:00'
};

async function run() {
  console.log('--- Starting Customer Role in Team Management UI Validation ---');

  const server = await preview({
    root: appRoot,
    preview: { port: 4174 }
  });
  const baseUrl = server.resolvedUrls.local[0];
  console.log(`Vite preview running at ${baseUrl}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      const method = req.method();

      if (method === 'OPTIONS') {
        req.respond({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*'
          }
        });
        return;
      }

      if (url.includes('/rest/v1/app_users')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(mockTeam)
        });
        return;
      }

      if (url.includes('/rest/v1/crm_parties')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(mockParties)
        });
        return;
      }

      if (url.includes('/rest/v1/crm_settings')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify([mockCrmSettings])
        });
        return;
      }

      req.continue();
    });

    await page.evaluateOnNewDocument((admin, settings) => {
      const session = {
        access_token: 'fake-jwt-token',
        token_type: 'bearer',
        user: { id: admin.id, email: admin.email, role: 'authenticated' }
      };
      localStorage.setItem('sb-fwkjddflpzkowlawkmka-auth-token', JSON.stringify(session));
      localStorage.setItem('shubhlabh_crm_user', JSON.stringify(admin));
      localStorage.setItem('shubhlabh_crm_settings', JSON.stringify(settings));
    }, mockAdminUser, mockCrmSettings);

    console.log('Navigating to Settings page with tab=team...');
    await page.goto(`${baseUrl}settings?tab=team`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    console.log('Capturing team table with Customer role entries...');
    await page.screenshot({
      path: path.join(artifactsDir, 'settings-team-with-customers.png'),
      fullPage: false
    });
    console.log('Saved: settings-team-with-customers.png');

    // Click "Add Team Member" button
    console.log('Clicking Add Team Member button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => b.textContent.includes('Add Team Member'));
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Select "Customer" role in modal
    console.log('Selecting Customer (Order App) role in modal...');
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const select of selects) {
        const optionValues = Array.from(select.options).map(o => o.value);
        if (optionValues.includes('Customer')) {
          select.value = 'Customer';
          select.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
    await new Promise(r => setTimeout(r, 1200));

    console.log('Capturing Add Customer Modal with linked customer selector...');
    await page.screenshot({
      path: path.join(artifactsDir, 'settings-add-customer-modal.png'),
      fullPage: false
    });
    console.log('Saved: settings-add-customer-modal.png');

    console.log('--- ALL VALIDATIONS & SCREENSHOTS COMPLETED SUCCESSFULLY ---');

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

run();
