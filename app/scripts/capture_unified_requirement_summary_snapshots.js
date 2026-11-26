import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/unified-requirement-summary');
const brainArtifactsDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\81a47899-3932-4a28-a500-5d18dac96ab8\\unified-requirement-summary';

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
      { id: 'item-1', requirement_id: 'req-001', product_name: 'Diamond', quantity: 70, unit: 'Bags', weight: 45, category: 'Pallet' }
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
      { id: 'item-2', requirement_id: 'req-002', product_name: 'Dry Mix', quantity: 60, unit: 'Bags', weight: 40, category: 'Mix' }
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
    product_type: null,
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
      { id: 'item-3a', requirement_id: 'req-003', product_name: 'Diamond', quantity: 50, unit: 'Bags', weight: 45, category: 'Pallet' },
      { id: 'item-3b', requirement_id: 'req-003', product_name: 'Naman', quantity: 15, unit: 'Bags', weight: 45, category: 'Pallet' },
      { id: 'item-3c', requirement_id: 'req-003', product_name: '8000', quantity: 15, unit: 'Bags', weight: 50, category: 'Pallet' }
    ]
  },
  {
    id: 'req-006',
    party_id: 'party-006',
    customer_name: 'Yashika Agro Industries',
    customer_city: 'Merta',
    product_type: null,
    demand_ref: 'D-302',
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
      { id: 'item-6a', requirement_id: 'req-006', product_name: 'Chana Churi', quantity: 3, unit: 'MT', weight: 40, category: 'Churi' },
      { id: 'item-6b', requirement_id: 'req-006', product_name: 'Dry Mix', quantity: 5, unit: 'MT', weight: 40, category: 'Mix' },
      { id: 'item-6c', requirement_id: 'req-006', product_name: 'Lapti Mix', quantity: 2, unit: 'MT', weight: 40, category: 'Mix' }
    ]
  }
];

const mockItems = mockRequirements.flatMap(r => r.requirement_items || []);

async function saveBoth(page, filename) {
  const p1 = path.join(artifactsDir, filename);
  const p2 = path.join(brainArtifactsDir, filename);
  await page.screenshot({ path: p1, fullPage: false });
  fs.copyFileSync(p1, p2);
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  console.log('Starting Vite preview server on port 5196...');
  const server = await preview({
    root: appRoot,
    preview: { port: 5196, host: 'localhost' }
  });

  const baseUrl = `http://localhost:5196`;
  console.log(`Preview server running at ${baseUrl}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const uniqueUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-unified-req-'));

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    userDataDir: uniqueUserDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

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
            body: JSON.stringify([
              { transporter_name: 'Banna Ji', contact_number: '9257150693' }
            ])
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
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockItems)
          });
          return;
        }

        if (reqUrl.includes('v_board_requirements') || reqUrl.includes('/rest/v1/requirements')) {
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

    await page.evaluateOnNewDocument((user) => {
      const mockSession = {
        access_token: 'fake-jwt-token-testing',
        refresh_token: 'fake-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
        token_type: 'bearer',
        user: {
          id: user.id,
          email: user.email,
          role: 'authenticated'
        }
      };
      localStorage.setItem('sb-fwkjddflpzkowlawkmka-auth-token', JSON.stringify(mockSession));
      localStorage.setItem('userProfile', JSON.stringify(user));
    }, mockAdminUser);

    console.log('Navigating to Requirements Board...');
    await page.goto(`${baseUrl}/requirements`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // SNAPSHOT 1: Customer View with Yashika Agro expanded showing multi-product separate rows
    console.log('Capturing Snapshot 1: Yashika Agro expanded with separate rows...');
    const yashikaHeader = await page.evaluateHandle(() => {
      const headers = Array.from(document.querySelectorAll('h3'));
      return headers.find(h => h.textContent.includes('Yashika Agro Industries'));
    });
    if (yashikaHeader) {
      await yashikaHeader.click();
      await new Promise(r => setTimeout(r, 600));
    }
    await saveBoth(page, '01_customer_view_yashika_multi_product_separate_rows.png');

    // SNAPSHOT 2: Customer Card Header showing compatible unit totals and products
    console.log('Capturing Snapshot 2: Customer card headers...');
    await saveBoth(page, '02_customer_header_compatible_unit_totals.png');

    // SNAPSHOT 3: Flat List View showing itemized breakdown box
    console.log('Switching to Flat List View...');
    const flatListBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Flat List'));
    });
    if (flatListBtn) {
      await flatListBtn.click();
      await new Promise(r => setTimeout(r, 600));
    }
    await saveBoth(page, '03_flat_list_itemized_breakdown.png');

    // Switch back to Customer View for modal tests
    const customerViewBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Customer View'));
    });
    if (customerViewBtn) {
      await customerViewBtn.click();
      await new Promise(r => setTimeout(r, 600));
    }

    // SNAPSHOT 4: Share Dispatch List Preview Modal
    console.log('Opening Share Dispatch List modal...');
    const shareBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Share Dispatch List'));
    });
    if (shareBtn) {
      await shareBtn.click();
      await new Promise(r => setTimeout(r, 600));
    }
    await saveBoth(page, '04_share_dispatch_list_modal_itemized.png');

    // Close Share Dispatch List Modal
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 400));

    // SNAPSHOT 5: Mark as Dispatched Modal with multi-product items
    console.log('Opening Mark as Dispatched modal for Yashika Agro...');
    const moreMenuBtn = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const yashikaRow = rows.find(r => r.textContent.includes('Chana Churi'));
      if (!yashikaRow) return false;
      const moreBtn = yashikaRow.querySelector('button[aria-label="More actions"]');
      if (moreBtn) {
        moreBtn.click();
        return true;
      }
      return false;
    });

    if (moreMenuBtn) {
      await new Promise(r => setTimeout(r, 300));
      await page.evaluate(() => {
        const menuItems = Array.from(document.querySelectorAll('button'));
        const dispatchOption = menuItems.find(b => b.textContent.includes('Mark as Dispatched'));
        if (dispatchOption) dispatchOption.click();
      });
      await new Promise(r => setTimeout(r, 600));
      await saveBoth(page, '05_mark_dispatched_modal_multi_product.png');
    }

    console.log('All visual verification snapshots captured successfully!');

  } catch (err) {
    console.error('Snapshot capture error:', err);
    throw err;
  } finally {
    await browser.close();
    server.httpServer.close();
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
