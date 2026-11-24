import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/dispatch-transporter');
const brainArtifactsDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\81a47899-3932-4a28-a500-5d18dac96ab8\\dispatch-transporter';

for (const dir of [artifactsDir, brainArtifactsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const mockRequirements = [
  {
    id: 'req-001',
    customer_name: 'Aggarwal Agro Industries',
    expected_date: '2026-11-25',
    quantity: 250,
    required_quantity: 250,
    unit: 'Bags',
    status: 'Approved',
    dispatch_progress: 'Not Dispatched',
    total_dispatched_quantity: 0,
    pending_quantity: 250,
    created_at: new Date().toISOString(),
    assigned_user: { id: 'usr-1', display_name: 'Ramesh Sharma' },
    requirement_items: [
      {
        id: 'item-1',
        requirement_id: 'req-001',
        product_name: 'Premium Cattle Feed 50kg',
        quantity: 250,
        unit: 'Bags',
        bag_weight_kg: 50
      }
    ],
    crm_parties: {
      id: 'party-1',
      name: 'Aggarwal Agro Industries',
      city: 'Jaipur'
    }
  },
  {
    id: 'req-002',
    customer_name: 'Karni Dairy Farm',
    expected_date: '2026-11-26',
    quantity: 100,
    required_quantity: 100,
    unit: 'Bags',
    status: 'Approved',
    dispatch_progress: 'Not Dispatched',
    total_dispatched_quantity: 0,
    pending_quantity: 100,
    created_at: new Date().toISOString(),
    assigned_user: { id: 'usr-1', display_name: 'Ramesh Sharma' },
    requirement_items: [
      {
        id: 'item-2',
        requirement_id: 'req-002',
        product_name: 'Super Milk Booster 50kg',
        quantity: 100,
        unit: 'Bags',
        bag_weight_kg: 50
      }
    ],
    crm_parties: {
      id: 'party-2',
      name: 'Karni Dairy Farm',
      city: 'Bikaner'
    }
  }
];

const mockTransporters = [
  {
    transporter_name: 'Jaipur Golden Transport',
    contact_number: '9829012345',
    is_fraud: false,
    added_locations: ['Jaipur', 'Alwar', 'Delhi'],
    removed_locations: []
  },
  {
    transporter_name: 'VRL Logistics',
    contact_number: '9414098765',
    is_fraud: false,
    added_locations: ['Pan India'],
    removed_locations: []
  },
  {
    transporter_name: 'Marwar Cargo Carrier',
    contact_number: '9414446444',
    is_fraud: false,
    added_locations: ['Jodhpur', 'Nagaur'],
    removed_locations: []
  }
];

const mockDispatches = [
  {
    id: 'disp-1',
    transporter_name: 'Jaipur Golden Transport',
    driver_mobile: '9829012345',
    truck_number: 'RJ 14 GA 1234',
    status: 'Dispatched',
    requirements: { crm_parties: { city: 'Jaipur' } }
  },
  {
    id: 'disp-2',
    transporter_name: 'VRL Logistics',
    driver_mobile: '9414098765',
    truck_number: 'KA 01 AB 9988',
    status: 'Dispatched',
    requirements: { crm_parties: { city: 'Delhi' } }
  }
];

const mockAdminUser = {
  id: 'usr-admin-1',
  email: 'admin@shubhlabh.com',
  display_name: 'Admin User',
  role: 'Admin',
  is_active: true,
  theme_mode: 'light',
  accent_color: '#078B54'
};

async function run() {
  console.log('--- Starting SL-DISPATCH-TRANSPORTER-01 UI Automation ---');

  const server = await preview({
    root: appRoot,
    preview: { port: 4176 }
  });
  const baseUrl = server.resolvedUrls.local[0];
  console.log(`Vite preview running at ${baseUrl}`);

  let browser;
  try {
    console.log('Launching system Chrome browser...');
    browser = await puppeteer.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

    // Request interception for full offline simulation
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      const method = req.method();

      if (url.includes('supabase.co')) {
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Content-Type': 'application/json'
        };

        if (method === 'OPTIONS') {
          req.respond({ status: 204, headers: corsHeaders });
          return;
        }

        if (url.includes('auth/v1/user') || url.includes('auth/v1/session') || url.includes('auth/v1/token')) {
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

        if (url.includes('app_users')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockAdminUser)
          });
          return;
        }

        if (url.includes('transporter_metadata')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockTransporters)
          });
          return;
        }

        if (url.includes('requirement_dispatches')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockDispatches)
          });
          return;
        }

        if (url.includes('requirements')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockRequirements)
          });
          return;
        }

        if (url.includes('crm_settings')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({ crm_name: 'Shubh Labh CRM' })
          });
          return;
        }

        req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify([]) });
        return;
      }

      req.continue();
    });

    // Set auth token in localStorage before navigation
    await page.evaluateOnNewDocument(() => {
      const mockSession = {
        access_token: 'fake-jwt-token-for-testing',
        refresh_token: 'fake-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
        token_type: 'bearer',
        user: {
          id: '1',
          email: 'admin@shubhlabh.com',
          role: 'authenticated',
          aud: 'authenticated'
        }
      };
      window.localStorage.setItem('sb-fwkjddflpzkowlawkmka-auth-token', JSON.stringify(mockSession));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Navigate to Requirements page
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Navigating to Requirements page...');
    await page.goto(`${baseUrl}requirements`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Expand the first customer accordion
    console.log('Expanding customer card in requirements pipeline...');
    await page.waitForSelector('.glass-panel h3', { timeout: 10000 });
    await page.evaluate(() => {
      const customerHeader = document.querySelector('.glass-panel h3');
      if (customerHeader) customerHeader.closest('div[style*="cursor"]').click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Open row action menu
    console.log('Opening action menu (three dots)...');
    await page.waitForSelector('button[aria-label="More actions"]', { timeout: 10000 });
    await page.evaluate(() => {
      const moreBtn = document.querySelector('button[aria-label="More actions"]');
      if (moreBtn) moreBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Click "Mark as Dispatched"
    console.log('Clicking "Mark as Dispatched"...');
    await page.evaluate(() => {
      const menuBtns = Array.from(document.querySelectorAll('button'));
      const dispatchBtn = menuBtns.find(b => b.innerText.includes('Mark as Dispatched'));
      if (dispatchBtn) dispatchBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Verify modal is open
    await page.waitForSelector('input[placeholder="Enter transporter name"]', { timeout: 5000 });
    console.log('✓ Dispatch confirmation modal opened!');

    // ─────────────────────────────────────────────────────────────────────────
    // Snapshot 1: Initial Empty Modal
    // ─────────────────────────────────────────────────────────────────────────
    const p1 = path.join(artifactsDir, '01_dispatch_modal_initial.png');
    const bp1 = path.join(brainArtifactsDir, '01_dispatch_modal_initial.png');
    await page.screenshot({ path: p1 });
    fs.copyFileSync(p1, bp1);
    console.log(`✓ Saved screenshot 1: ${p1}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Snapshot 2: Entering New Transporter with valid mobile number
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Entering new transporter details...');
    const nameInput = await page.$('input[placeholder="Enter transporter name"]');
    const mobileInput = await page.$('input[placeholder="Enter 10-digit mobile number"]');

    await nameInput.type('Sharma Freightways');
    await mobileInput.type('9828539054');
    await new Promise(r => setTimeout(r, 500));

    const p2 = path.join(artifactsDir, '02_dispatch_modal_new_transporter.png');
    const bp2 = path.join(brainArtifactsDir, '02_dispatch_modal_new_transporter.png');
    await page.screenshot({ path: p2 });
    fs.copyFileSync(p2, bp2);
    console.log(`✓ Saved screenshot 2: ${p2}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Snapshot 3: Existing Transporter Detected by Mobile Number
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Testing existing transporter detection by mobile number...');
    // Clear inputs
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[placeholder*="transporter"], input[placeholder*="mobile"]');
      inputs.forEach(i => { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
    });
    await new Promise(r => setTimeout(r, 300));

    // Type existing transporter mobile 9829012345
    await mobileInput.type('9829012345');
    await new Promise(r => setTimeout(r, 600));

    const p3 = path.join(artifactsDir, '03_dispatch_modal_existing_detected.png');
    const bp3 = path.join(brainArtifactsDir, '03_dispatch_modal_existing_detected.png');
    await page.screenshot({ path: p3 });
    fs.copyFileSync(p3, bp3);
    console.log(`✓ Saved screenshot 3: ${p3}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Snapshot 4: Validation Error (Invalid Mobile)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Testing validation error feedback...');
    // Clear mobile and enter invalid 5 digits
    await page.evaluate(() => {
      const mInput = document.querySelector('input[placeholder*="mobile"]');
      if (mInput) {
        mInput.value = '98285';
        mInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 300));

    // Click "Mark as Dispatched" to trigger validation error
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const confirmBtn = btns.find(b => b.innerText.includes('Mark as Dispatched') && b.closest('[role="dialog"]'));
      if (confirmBtn) confirmBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const p4 = path.join(artifactsDir, '04_dispatch_modal_validation_error.png');
    const bp4 = path.join(brainArtifactsDir, '04_dispatch_modal_validation_error.png');
    await page.screenshot({ path: p4 });
    fs.copyFileSync(p4, bp4);
    console.log(`✓ Saved screenshot 4: ${p4}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Snapshot 5: Transporter List in Logistics page
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Navigating to Logistics page...');
    await page.goto(`${baseUrl}logistics`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    const p5 = path.join(artifactsDir, '05_transporter_list_view.png');
    const bp5 = path.join(brainArtifactsDir, '05_transporter_list_view.png');
    await page.screenshot({ path: p5 });
    fs.copyFileSync(p5, bp5);
    console.log(`✓ Saved screenshot 5: ${p5}`);

    console.log('--- ALL 5 DISPATCH & TRANSPORTER SCREENSHOTS COMPLETED SUCCESSFULLY ---');
  } finally {
    if (browser) await browser.close();
    server.httpServer.close();
  }
}

run().catch(err => {
  console.error('Snapshot automation failed:', err);
  process.exit(1);
});
