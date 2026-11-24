import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/dispatched-transport-summary');
const brainArtifactsDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\81a47899-3932-4a28-a500-5d18dac96ab8\\dispatched-transport-summary';

for (const dir of [artifactsDir, brainArtifactsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Mock requirements matching the sprint scenarios:
// - Multiple dispatched requirements with different transporters
// - Historical record without transporter information
// - Active pending requirement (to verify exclusion)
const mockRequirements = [
  {
    id: 'req-disp-01',
    customer_name: 'Aggarwal Agro Industries',
    expected_date: '2026-11-20',
    quantity: 250,
    required_quantity: 250,
    unit: 'Bags',
    status: 'Closed',
    dispatch_progress: 'Fully Dispatched',
    total_dispatched_quantity: 250,
    pending_quantity: 0,
    latest_dispatch_date: '2026-11-24',
    created_at: '2026-11-18T10:00:00Z',
    assigned_to: 'usr-admin-1',
    owner_email: 'admin@shubhlabh.com',
    product_type: 'Premium Cattle Feed 50kg',
    demand_ref: 'DEM-AGG-001',
    party_id: 'party-1',
    customer_city: 'Jaipur',
    customer_mobile: '9828011223',
    requirement_items: [
      { id: 'item-1', requirement_id: 'req-disp-01', product_name: 'Premium Cattle Feed 50kg', quantity: 250, unit: 'Bags', bag_weight_kg: 50 }
    ]
  },
  {
    id: 'req-disp-02',
    customer_name: 'Karni Dairy Farm',
    expected_date: '2026-11-22',
    quantity: 150,
    required_quantity: 150,
    unit: 'Bags',
    status: 'Dispatched',
    dispatch_progress: 'Fully Dispatched',
    total_dispatched_quantity: 150,
    pending_quantity: 0,
    latest_dispatch_date: '2026-11-24',
    created_at: '2026-11-19T11:00:00Z',
    assigned_to: 'usr-admin-1',
    owner_email: 'admin@shubhlabh.com',
    product_type: 'Super Milk Booster 50kg',
    demand_ref: 'DEM-KRN-002',
    party_id: 'party-2',
    customer_city: 'Bikaner',
    customer_mobile: '9414022334',
    requirement_items: [
      { id: 'item-2', requirement_id: 'req-disp-02', product_name: 'Super Milk Booster 50kg', quantity: 150, unit: 'Bags', bag_weight_kg: 50 }
    ]
  },
  {
    id: 'req-disp-03-historical',
    customer_name: 'Marwar Grain Traders',
    expected_date: '2026-10-15',
    quantity: 100,
    required_quantity: 100,
    unit: 'Bags',
    status: 'Closed',
    dispatch_progress: 'Fully Dispatched',
    total_dispatched_quantity: 100,
    pending_quantity: 0,
    latest_dispatch_date: '2026-10-18',
    created_at: '2026-10-10T09:00:00Z',
    assigned_to: 'usr-admin-1',
    owner_email: 'admin@shubhlabh.com',
    product_type: 'Standard Mustard Khal 50kg',
    demand_ref: 'DEM-MWR-003',
    party_id: 'party-3',
    customer_city: 'Jodhpur',
    customer_mobile: '9414033445',
    requirement_items: [
      { id: 'item-3', requirement_id: 'req-disp-03-historical', product_name: 'Standard Mustard Khal 50kg', quantity: 100, unit: 'Bags', bag_weight_kg: 50 }
    ]
  },
  {
    id: 'req-open-04',
    customer_name: 'Sunrise Livestock Feeders',
    expected_date: '2026-11-24', // Due today
    quantity: 80,
    required_quantity: 80,
    unit: 'Bags',
    status: 'Commercial Intent',
    dispatch_progress: 'Not Dispatched',
    total_dispatched_quantity: 0,
    pending_quantity: 80,
    created_at: '2026-11-21T10:00:00Z',
    assigned_to: 'usr-admin-1',
    owner_email: 'admin@shubhlabh.com',
    product_type: 'Wheat Bran Chapad 50kg',
    demand_ref: 'DEM-SNR-004',
    party_id: 'party-4',
    customer_city: 'Alwar',
    customer_mobile: '9828555667',
    requirement_items: [
      { id: 'item-4', requirement_id: 'req-open-04', product_name: 'Wheat Bran Chapad 50kg', quantity: 80, unit: 'Bags', bag_weight_kg: 50 }
    ]
  }
];

const mockDispatches = [
  {
    id: 'disp-01',
    requirement_id: 'req-disp-01',
    transporter_name: 'Sharma Freightways',
    driver_mobile: '9828539054',
    dispatch_date: '2026-11-24',
    truck_number: 'RJ 14 GA 1234',
    status: 'Dispatched',
    created_at: '2026-11-24T09:30:00Z'
  },
  {
    id: 'disp-02',
    requirement_id: 'req-disp-02',
    transporter_name: 'Jaipur Golden Transport',
    driver_mobile: '9829012345',
    dispatch_date: '2026-11-24',
    truck_number: 'RJ 14 GB 5678',
    status: 'Dispatched',
    created_at: '2026-11-24T11:15:00Z'
  },
  {
    // Historical record with no transporter details
    id: 'disp-03',
    requirement_id: 'req-disp-03-historical',
    transporter_name: null,
    driver_mobile: null,
    dispatch_date: '2026-10-18',
    truck_number: '',
    status: 'Dispatched',
    created_at: '2026-10-18T10:00:00Z'
  }
];

const mockTransporterMetadata = [
  { transporter_name: 'Sharma Freightways', contact_number: '9828539054' },
  { transporter_name: 'Jaipur Golden Transport', contact_number: '9829012345' }
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
  console.log('--- Starting SL-DISPATCHED-TRANSPORT-SUMMARY-03 UI Automation ---');

  const server = await preview({
    root: appRoot,
    preview: { port: 4177 }
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
    await page.setViewport({ width: 1280, height: 850, deviceScaleFactor: 2 });

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

        if (url.includes('requirement_dispatches')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockDispatches)
          });
          return;
        }

        if (url.includes('transporter_metadata')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockTransporterMetadata)
          });
          return;
        }

        if (url.includes('v_board_requirements') || url.includes('requirements')) {
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
          id: 'usr-admin-1',
          email: 'admin@shubhlabh.com',
          role: 'authenticated',
          aud: 'authenticated'
        }
      };
      window.localStorage.setItem('sb-fwkjddflpzkowlawkmka-auth-token', JSON.stringify(mockSession));
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Snapshot 1: /requirements?status=Dispatched in Flat List View (Desktop)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Navigating to target URL: /requirements?status=Dispatched (Flat List View)...');
    await page.goto(`${baseUrl}requirements?status=Dispatched`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Switch to Flat List View to see cards
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const flatBtn = btns.find(b => b.innerText.includes('Flat List'));
      if (flatBtn) flatBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Verify Transport Details boxes are rendered
    await page.waitForSelector('.transport-details-box', { timeout: 10000 });
    console.log('✓ Transport details box located on requirement cards!');

    const p1 = path.join(artifactsDir, '01_dispatched_flat_cards_desktop.png');
    const bp1 = path.join(brainArtifactsDir, '01_dispatched_flat_cards_desktop.png');
    await page.screenshot({ path: p1, fullPage: false });
    fs.copyFileSync(p1, bp1);
    console.log(`✓ Saved screenshot 1: ${p1}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Snapshot 2: /requirements?status=Dispatched in Customer View (Auto-Expanded)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Switching to Customer View...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const custBtn = btns.find(b => b.innerText.includes('Customer View'));
      if (custBtn) custBtn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    const p2 = path.join(artifactsDir, '02_dispatched_customer_view_desktop.png');
    const bp2 = path.join(brainArtifactsDir, '02_dispatched_customer_view_desktop.png');
    await page.screenshot({ path: p2, fullPage: false });
    fs.copyFileSync(p2, bp2);
    console.log(`✓ Saved screenshot 2: ${p2}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Snapshot 3: Filter Separation: Dispatched items excluded from "All Open"
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Navigating to All Open (Active Pipeline) to verify exclusion...');
    await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('button'));
      const activeChip = chips.find(b => b.innerText.includes('All active'));
      if (activeChip) activeChip.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    const p3 = path.join(artifactsDir, '03_all_active_excludes_dispatched.png');
    const bp3 = path.join(brainArtifactsDir, '03_all_active_excludes_dispatched.png');
    await page.screenshot({ path: p3, fullPage: false });
    fs.copyFileSync(p3, bp3);
    console.log(`✓ Saved screenshot 3: ${p3}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Snapshot 4: Mobile Viewport (390 x 844) on Dispatched
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Testing mobile viewport 390 × 844 on /requirements?status=Dispatched...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`${baseUrl}requirements?status=Dispatched`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    // Switch to flat view on mobile
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const flatBtn = btns.find(b => b.innerText.includes('Flat List'));
      if (flatBtn) flatBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    const p4 = path.join(artifactsDir, '04_dispatched_mobile_cards.png');
    const bp4 = path.join(brainArtifactsDir, '04_dispatched_mobile_cards.png');
    await page.screenshot({ path: p4, fullPage: false });
    fs.copyFileSync(p4, bp4);
    console.log(`✓ Saved screenshot 4: ${p4}`);

    console.log('--- ALL 4 DISPATCHED TRANSPORT SUMMARY SCREENSHOTS COMPLETED SUCCESSFULLY ---');
  } finally {
    if (browser) await browser.close();
    server.httpServer.close();
  }
}

run().catch(err => {
  console.error('Snapshot automation failed:', err);
  process.exit(1);
});
