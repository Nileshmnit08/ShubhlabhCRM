import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/requirements-transporter-column');
const brainArtifactsDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\81a47899-3932-4a28-a500-5d18dac96ab8\\requirements-transporter-column';

for (const dir of [artifactsDir, brainArtifactsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const mockCustomerPartyId = 'party-arihant-001';

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
    id: 'req-001-new',
    customer_name: 'Arihant Kumar Rahul Kumar Medta Seety - S',
    expected_date: '2026-11-20',
    quantity: 60,
    required_quantity: 60,
    unit: 'Bags',
    status: 'Qualified',
    dispatch_progress: 'Not Dispatched',
    total_dispatched_quantity: 0,
    pending_quantity: 60,
    latest_dispatch_date: null,
    created_at: '2026-11-20T10:00:00Z',
    assigned_to: 'usr-vishnu',
    owner_email: 'vishnu@shubhlabh.com',
    product_type: 'Dry Mix',
    demand_ref: 'D-205',
    party_id: mockCustomerPartyId,
    customer_city: 'Medta City',
    customer_mobile: '9829012345',
    customer_whatsapp: '9829012345',
    priority: 'Normal',
    requirement_items: [
      { id: 'item-1', requirement_id: 'req-001-new', product_name: 'Dry Mix', quantity: 60, unit: 'Bags', bag_weight_kg: 50 }
    ]
  },
  {
    id: 'req-002-disp',
    customer_name: 'Arihant Kumar Rahul Kumar Medta Seety - S',
    expected_date: '2026-11-18',
    quantity: 50,
    required_quantity: 50,
    unit: 'Bags',
    status: 'Dispatched',
    dispatch_progress: 'Fully Dispatched',
    total_dispatched_quantity: 50,
    pending_quantity: 0,
    latest_dispatch_date: '2026-11-18',
    created_at: '2026-11-15T11:00:00Z',
    assigned_to: 'usr-vishnu',
    owner_email: 'vishnu@shubhlabh.com',
    product_type: 'Makka Aata',
    demand_ref: 'D-280',
    party_id: mockCustomerPartyId,
    customer_city: 'Medta City',
    customer_mobile: '9829012345',
    customer_whatsapp: '9829012345',
    priority: 'Normal',
    dispatches: [
      {
        id: 'disp-002',
        requirement_id: 'req-002-disp',
        transporter_name: 'Sharma Roadlines',
        driver_mobile: '9784567890',
        dispatch_date: '2026-11-18',
        quantity: 50,
        unit: 'Bags',
        status: 'Dispatched',
        created_at: '2026-11-18T14:30:00Z'
      }
    ],
    requirement_items: [
      { id: 'item-2', requirement_id: 'req-002-disp', product_name: 'Makka Aata', quantity: 50, unit: 'Bags', bag_weight_kg: 50 }
    ]
  },
  {
    id: 'req-003-disp',
    customer_name: 'Arihant Kumar Rahul Kumar Medta Seety - S',
    expected_date: '2026-11-16',
    quantity: 40,
    required_quantity: 40,
    unit: 'Bags',
    status: 'Dispatched',
    dispatch_progress: 'Fully Dispatched',
    total_dispatched_quantity: 40,
    pending_quantity: 0,
    latest_dispatch_date: '2026-11-16',
    created_at: '2026-11-12T09:00:00Z',
    assigned_to: 'usr-vishnu',
    owner_email: 'vishnu@shubhlabh.com',
    product_type: '8000',
    demand_ref: 'D-261',
    party_id: mockCustomerPartyId,
    customer_city: 'Medta City',
    customer_mobile: '9829012345',
    customer_whatsapp: '9829012345',
    priority: 'Normal',
    dispatches: [
      {
        id: 'disp-003',
        requirement_id: 'req-003-disp',
        transporter_name: 'Meena Transport',
        driver_mobile: '9414056789',
        dispatch_date: '2026-11-16',
        quantity: 40,
        unit: 'Bags',
        status: 'Dispatched',
        created_at: '2026-11-16T10:15:00Z'
      }
    ],
    requirement_items: [
      { id: 'item-3', requirement_id: 'req-003-disp', product_name: '8000', quantity: 40, unit: 'Bags', bag_weight_kg: 50 }
    ]
  },
  {
    id: 'req-004-no-history',
    customer_name: 'Shree Krishna Agro - Jaipur',
    expected_date: '2026-11-26',
    quantity: 100,
    required_quantity: 100,
    unit: 'Bags',
    status: 'Identified',
    dispatch_progress: 'Not Dispatched',
    total_dispatched_quantity: 0,
    pending_quantity: 100,
    latest_dispatch_date: null,
    created_at: '2026-11-22T08:00:00Z',
    assigned_to: 'usr-vishnu',
    owner_email: 'vishnu@shubhlabh.com',
    product_type: 'Cotton Cake 50kg',
    demand_ref: 'D-501',
    party_id: 'party-krishna-002',
    customer_city: 'Jaipur',
    customer_mobile: '9828099887',
    customer_whatsapp: '9828099887',
    priority: 'High',
    requirement_items: [
      { id: 'item-4', requirement_id: 'req-004-no-history', product_name: 'Cotton Cake 50kg', quantity: 100, unit: 'Bags', bag_weight_kg: 50 }
    ]
  }
];

const mockCustomerDispatches = [
  {
    id: 'disp-hist-001',
    requirement_id: 'req-closed-old',
    transporter_name: 'Vishnu Transport',
    driver_mobile: '9829012345',
    dispatch_date: '2026-11-18',
    status: 'Dispatched',
    created_at: '2026-11-18T18:00:00Z',
    requirements: { id: 'req-closed-old', party_id: mockCustomerPartyId }
  }
];

const mockTransporters = [
  { transporter_name: 'Vishnu Transport', contact_number: '9829012345', is_fraud: false },
  { transporter_name: 'Sharma Roadlines', contact_number: '9784567890', is_fraud: false },
  { transporter_name: 'Meena Transport', contact_number: '9414056789', is_fraud: false },
  { transporter_name: 'Banna Ji', contact_number: '9829099888', is_fraud: false }
];

async function capture() {
  console.log('Starting preview server on port 4186...');
  const previewServer = await preview({
    root: appRoot,
    preview: { port: 4186 }
  });

  const url = 'http://localhost:4186';
  console.log(`Preview server running at ${url}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
    
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('fetchRequirements')) {
        console.log('BROWSER LOG:', msg.type(), msg.text());
      }
    });
    page.on('pageerror', err => console.log('BROWSER PAGEERROR:', err.message));

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
          const reqDispatches = mockRequirements.flatMap(r => r.dispatches || []);
          const allDisp = [...reqDispatches, ...mockCustomerDispatches];
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(allDisp)
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

        // v_board_requirements view
        if (reqUrl.includes('v_board_requirements')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockRequirements)
          });
          return;
        }

        if (reqUrl.includes('crm_settings')) {
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

    // Inject Auth Session in localStorage
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
    });

    console.log('Navigating to Requirements page...');
    await page.goto(`${url}/requirements?view=customer&status=All`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Expand customer cards
    await page.evaluate(() => {
      const panels = Array.from(document.querySelectorAll('.glass-panel'));
      for (let i = 1; i < panels.length; i++) {
        const card = panels[i];
        if (!card.querySelector('table')) {
          const header = card.querySelector('div[style*="cursor: pointer"]');
          if (header) header.click();
        }
      }
    });
    await new Promise(r => setTimeout(r, 1200));

    // Screenshot 1: Requirements Board Overview with new column
    const snap1 = path.resolve(artifactsDir, '01_requirements_board_new_transporter_column.png');
    const brain1 = path.resolve(brainArtifactsDir, '01_requirements_board_new_transporter_column.png');
    await page.screenshot({ path: snap1, fullPage: false });
    fs.copyFileSync(snap1, brain1);
    console.log('Saved Screenshot 1:', snap1);

    // Screenshot 2: Customer View Table Detail (Arihant card)
    const customerPanels = await page.$$('.glass-panel');
    const arihantCard = customerPanels.length > 1 ? customerPanels[1] : customerPanels[0];
    if (arihantCard) {
      const snap2 = path.resolve(artifactsDir, '02_customer_table_transporter_column_detail.png');
      const brain2 = path.resolve(brainArtifactsDir, '02_customer_table_transporter_column_detail.png');
      await arihantCard.screenshot({ path: snap2 });
      fs.copyFileSync(snap2, brain2);
      console.log('Saved Screenshot 2:', snap2);
    }

    // Screenshot 3: Open Mark as Dispatched Modal for Row 1
    console.log('Opening Mark as Dispatched modal...');
    const moreBtn = await page.$('button[aria-label="More actions"]');
    if (moreBtn) {
      await moreBtn.click();
      await new Promise(r => setTimeout(r, 500));

      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const dispatchBtn = buttons.find(b => b.textContent && b.textContent.includes('Mark as Dispatched'));
        if (dispatchBtn) {
          dispatchBtn.click();
          return true;
        }
        return false;
      });

      console.log('Dispatch button clicked:', clicked);
      await new Promise(r => setTimeout(r, 800));

      const snap3 = path.resolve(artifactsDir, '03_prefilled_mark_as_dispatched_modal.png');
      const brain3 = path.resolve(brainArtifactsDir, '03_prefilled_mark_as_dispatched_modal.png');
      await page.screenshot({ path: snap3 });
      fs.copyFileSync(snap3, brain3);
      console.log('Saved Screenshot 3:', snap3);

      // Close modal
      await page.evaluate(() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Cancel');
        if (cancelBtn) cancelBtn.click();
      });
      await new Promise(r => setTimeout(r, 500));
    }

    // Screenshot 4: Dispatched Filter View
    console.log('Navigating to Dispatched Filter...');
    await page.goto(`${url}/requirements?view=customer&status=Dispatched`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    await page.evaluate(() => {
      const panels = Array.from(document.querySelectorAll('.glass-panel'));
      for (let i = 1; i < panels.length; i++) {
        const card = panels[i];
        if (!card.querySelector('table')) {
          const header = card.querySelector('div[style*="cursor: pointer"]');
          if (header) header.click();
        }
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    const snap4 = path.resolve(artifactsDir, '04_dispatched_filter_actual_transporter.png');
    const brain4 = path.resolve(brainArtifactsDir, '04_dispatched_filter_actual_transporter.png');
    await page.screenshot({ path: snap4, fullPage: false });
    fs.copyFileSync(snap4, brain4);
    console.log('Saved Screenshot 4:', snap4);

    // Screenshot 5: Mobile Viewport (390px)
    console.log('Setting mobile viewport (390x844)...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`${url}/requirements?view=customer&status=All`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    await page.evaluate(() => {
      const panels = Array.from(document.querySelectorAll('.glass-panel'));
      for (let i = 1; i < panels.length; i++) {
        const card = panels[i];
        if (!card.querySelector('table')) {
          const header = card.querySelector('div[style*="cursor: pointer"]');
          if (header) header.click();
        }
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    const snap5 = path.resolve(artifactsDir, '05_mobile_requirements_transporter_column.png');
    const brain5 = path.resolve(brainArtifactsDir, '05_mobile_requirements_transporter_column.png');
    await page.screenshot({ path: snap5, fullPage: false });
    fs.copyFileSync(snap5, brain5);
    console.log('Saved Screenshot 5:', snap5);

    console.log('All 5 screenshots captured successfully!');
  } finally {
    await browser.close();
    previewServer.httpServer.close();
  }
}

capture().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
