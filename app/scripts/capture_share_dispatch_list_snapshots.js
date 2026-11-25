import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/requirements-share-dispatch-list');
const brainArtifactsDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\81a47899-3932-4a28-a500-5d18dac96ab8\\requirements-share-dispatch-list';

for (const dir of [artifactsDir, brainArtifactsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const mockAdminUser = {
  id: 'usr-admin-1',
  email: 'admin@shubhlabh.com',
  display_name: 'Admin User',
  role: 'Admin',
  is_active: true,
  theme_mode: 'light',
  accent_color: '#078B54'
};

const mockRequirements = [
  {
    id: 'req-001',
    party_id: 'party-001',
    customer_name: 'Radha Baat Bhandhar',
    customer_city: 'Lalchandpura',
    product_type: 'Diamond',
    demand_ref: 'D-284',
    expected_date: '2026-11-20',
    quantity: 70,
    required_quantity: 70,
    unit: 'Bags',
    status: 'New',
    dispatch_progress: 'Not Dispatched',
    total_dispatched_quantity: 0,
    pending_quantity: 70,
    is_pending: true,
    assigned_to: 'usr-vishnu',
    owner_email: 'vishnu@shubhlabh.com',
    priority: 'Normal',
    requirement_items: [
      { id: 'item-1', requirement_id: 'req-001', product_name: 'Diamond', quantity: 70, unit: 'Bags' }
    ]
  },
  {
    id: 'req-002',
    party_id: 'party-002',
    customer_name: 'Arihant Kumar Rahul Kumar',
    customer_city: 'Medta City',
    product_type: 'Dry Mix',
    demand_ref: 'D-205',
    expected_date: '2026-11-20',
    quantity: 60,
    required_quantity: 60,
    unit: 'Bags',
    status: 'New',
    dispatch_progress: 'Not Dispatched',
    total_dispatched_quantity: 0,
    pending_quantity: 60,
    is_pending: true,
    assigned_to: 'usr-vishnu',
    owner_email: 'vishnu@shubhlabh.com',
    priority: 'Normal',
    requirement_items: [
      { id: 'item-2', requirement_id: 'req-002', product_name: 'Dry Mix', quantity: 60, unit: 'Bags' }
    ],
    transporter_info: {
      transporterName: 'Banna Ji',
      mobileNumber: '9257150693',
      isSuggested: true
    }
  },
  {
    id: 'req-003',
    party_id: 'party-003',
    customer_name: 'Shyam Baat Bhandar',
    customer_city: 'Kanwarpura',
    product_type: 'Diamond',
    demand_ref: 'D-285',
    expected_date: '2026-11-22',
    quantity: 80,
    required_quantity: 80,
    unit: 'Bags',
    status: 'New',
    dispatch_progress: 'Not Dispatched',
    total_dispatched_quantity: 0,
    pending_quantity: 80,
    is_pending: true,
    assigned_to: 'usr-vishnu',
    owner_email: 'vishnu@shubhlabh.com',
    priority: 'Normal',
    requirement_items: [
      { id: 'item-3a', requirement_id: 'req-003', product_name: 'Diamond', quantity: 50, unit: 'Bags' },
      { id: 'item-3b', requirement_id: 'req-003', product_name: 'Naman', quantity: 15, unit: 'Bags' },
      { id: 'item-3c', requirement_id: 'req-003', product_name: '8000', quantity: 15, unit: 'Bags' }
    ]
  },
  {
    id: 'req-004',
    party_id: 'party-004',
    customer_name: 'Shri Chand Pasu Aahar',
    customer_city: 'Malpura',
    product_type: 'Dry Mix',
    demand_ref: 'D-286',
    expected_date: '2026-11-23',
    quantity: 80,
    required_quantity: 80,
    unit: 'Bags',
    status: 'New',
    dispatch_progress: 'Not Dispatched',
    total_dispatched_quantity: 0,
    pending_quantity: 80,
    is_pending: true,
    assigned_to: 'usr-vishnu',
    owner_email: 'vishnu@shubhlabh.com',
    priority: 'Normal',
    requirement_items: [
      { id: 'item-4', requirement_id: 'req-004', product_name: 'Dry Mix', quantity: 80, unit: 'Bags' }
    ]
  },
  {
    id: 'req-005',
    party_id: 'party-005',
    customer_name: 'Kailash Chand Deen Dayal',
    customer_city: 'Kasera, Shreemadhopur',
    product_type: 'Shubh Labh',
    demand_ref: 'D-287',
    expected_date: '2026-11-24',
    quantity: 60,
    required_quantity: 60,
    unit: 'Bags',
    status: 'New',
    dispatch_progress: 'Not Dispatched',
    total_dispatched_quantity: 0,
    pending_quantity: 60,
    is_pending: true,
    assigned_to: 'usr-vishnu',
    owner_email: 'vishnu@shubhlabh.com',
    priority: 'Normal',
    requirement_items: [
      { id: 'item-5', requirement_id: 'req-005', product_name: 'Shubh Labh', quantity: 60, unit: 'Bags' }
    ],
    transporter_info: {
      transporterName: 'Rampal',
      mobileNumber: '9929339063',
      isSuggested: true
    }
  },
  {
    id: 'req-006',
    party_id: 'party-006',
    customer_name: 'Yashika Agro Industries',
    customer_city: 'Merta',
    product_type: 'Chana Churi, Dry Mix, Lapti Mix',
    demand_ref: 'D-288',
    expected_date: '2026-11-25',
    quantity: 10,
    required_quantity: 10,
    unit: 'MT',
    status: 'New',
    dispatch_progress: 'Not Dispatched',
    total_dispatched_quantity: 0,
    pending_quantity: 10,
    is_pending: true,
    assigned_to: 'usr-vishnu',
    owner_email: 'vishnu@shubhlabh.com',
    priority: 'Normal',
    requirement_items: [
      { id: 'item-6', requirement_id: 'req-006', product_name: 'Chana Churi, Dry Mix, Lapti Mix', quantity: 10, unit: 'MT' }
    ]
  }
];

const mockTransporters = [
  { transporter_name: 'Banna Ji', contact_number: '9257150693' },
  { transporter_name: 'Rampal', contact_number: '9929339063' }
];

async function capture() {
  console.log('Starting preview server...');
  const server = await preview({
    root: appRoot,
    preview: { port: 5192, host: 'localhost' }
  });

  const url = 'http://localhost:5192/requirements';
  console.log('Launching browser...');
  const uniqueUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-share-disp-'));
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: uniqueUserDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });

    await page.setRequestInterception(true);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Content-Type': 'application/json'
    };

    page.on('request', (req) => {
      const reqUrl = req.url();
      if (req.method() === 'OPTIONS') {
        req.respond({ status: 204, headers: corsHeaders });
        return;
      }

      if (reqUrl.includes('supabase.co')) {
        if (reqUrl.includes('/auth/v1/user') || reqUrl.includes('/auth/v1/session') || reqUrl.includes('/auth/v1/token')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              id: 'usr-admin-1',
              email: 'admin@shubhlabh.com',
              role: 'authenticated',
              user_metadata: { role: 'Admin' }
            })
          });
          return;
        }

        if (reqUrl.includes('app_users')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockAdminUser)
          });
          return;
        }

        if (reqUrl.includes('transporter_metadata')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockTransporters)
          });
          return;
        }

        if (reqUrl.includes('requirement_dispatches')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify([])
          });
          return;
        }

        if (reqUrl.includes('requirement_items')) {
          const allItems = mockRequirements.flatMap(r => r.requirement_items || []);
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(allItems)
          });
          return;
        }

        if (reqUrl.includes('v_board_requirements')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockRequirements)
          });
          return;
        }

        req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify([]) });
        return;
      }

      req.continue();
    });

    await page.evaluateOnNewDocument(() => {
      const mockSession = {
        access_token: 'fake-jwt-token-testing',
        refresh_token: 'fake-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
        token_type: 'bearer',
        user: {
          id: 'usr-admin-1',
          email: 'admin@shubhlabh.com',
          role: 'authenticated',
          aud: 'authenticated'
        }
      };
      window.localStorage.setItem('sb-fwkjddflpzkowlawkmka-auth-token', JSON.stringify(mockSession));
      window.localStorage.setItem('sb-test-auth-token', JSON.stringify(mockSession));
    });

    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Save helper
    const saveShot = async (name) => {
      const p1 = path.join(artifactsDir, name);
      const p2 = path.join(brainArtifactsDir, name);
      await page.screenshot({ path: p1, fullPage: false });
      fs.copyFileSync(p1, p2);
      console.log('Saved screenshot:', name);
    };

    // 1. Requirements Board with Share Dispatch List button
    await saveShot('01_requirements_board_share_dispatch_button.png');

    const buttonTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
    });
    console.log('Available buttons on page:', buttonTexts);

    // 2. Click "Share Dispatch List" button
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.textContent.includes('Share Dispatch List'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Share Dispatch List button:', clicked);

    await new Promise(r => setTimeout(r, 1200));

    // 2. Dispatch List Preview modal
    await saveShot('02_dispatch_list_preview_modal.png');

    // 3. Scroll inside modal
    await page.evaluate(() => {
      const scrollable = document.querySelector('.dispatch-list-scrollable');
      if (scrollable) scrollable.scrollTop = 120;
    });
    await new Promise(r => setTimeout(r, 500));
    await saveShot('03_dispatch_list_scrollable.png');

    // 4. Click Copy button to capture "Copied!" feedback state
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const copyBtn = btns.find(b => b.textContent.includes('Copy'));
      if (copyBtn) copyBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await saveShot('04_copy_button_confirmation.png');

    console.log('All screenshots captured successfully!');
  } finally {
    await browser.close();
    server.httpServer.close();
  }
}

capture().catch(err => {
  console.error('Snapshot capture failed:', err);
  process.exit(1);
});
