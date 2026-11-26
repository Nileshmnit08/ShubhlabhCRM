import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/edit-requirement-full-mapping');
const brainArtifactsDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\81a47899-3932-4a28-a500-5d18dac96ab8\\edit-requirement-full-mapping';

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

const mockProducts = [
  { id: 'p-1', name: 'Chana Churi', category: 'Churi', active: true, unit_of_measure: 'MT' },
  { id: 'p-2', name: 'Dry Mix', category: 'Mix', active: true, unit_of_measure: 'MT' },
  { id: 'p-3', name: 'Lapti Mix', category: 'Mix', active: true, unit_of_measure: 'MT' },
  { id: 'p-4', name: 'Diamond', category: 'Pallet', active: true, unit_of_measure: 'Bags' },
  { id: 'p-5', name: 'Naman', category: 'Pallet', active: true, unit_of_measure: 'Bags' },
  { id: 'p-6', name: 'Shubh Labh', category: 'Pallet', active: true, unit_of_measure: 'Bags' }
];

let mockYashikaReq = {
  id: 'req-yashika-302',
  party_id: 'party-yashika',
  product_type: 'Chana Churi, Dry Mix, Lapti Mix',
  quantity: 10,
  unit: 'MT',
  expected_rate: 2200,
  expected_date: '2026-11-28',
  status: 'New',
  priority: 'Normal',
  intent_type: 'Order Intention',
  notes: 'Saved address - Merta',
  demand_ref: 'D-302',
  crm_parties: {
    id: 'party-yashika',
    display_name: 'Yashika Agro Industries',
    city: 'Merta',
    mobile: '9876543210'
  },
  requirement_items: [
    {
      id: 'item-302-1',
      requirement_id: 'req-yashika-302',
      product_name: 'Chana Churi',
      category: 'Churi',
      quantity: 3,
      unit: 'MT',
      weight: 40,
      gift: 'Scratch Card',
      other_gift: '',
      production_done: false
    },
    {
      id: 'item-302-2',
      requirement_id: 'req-yashika-302',
      product_name: 'Dry Mix',
      category: 'Mix',
      quantity: 5,
      unit: 'MT',
      weight: 40,
      gift: null,
      other_gift: '',
      production_done: false
    },
    {
      id: 'item-302-3',
      requirement_id: 'req-yashika-302',
      product_name: 'Lapti Mix',
      category: 'Mix',
      quantity: 2,
      unit: 'MT',
      weight: 40,
      gift: null,
      other_gift: '',
      production_done: false
    }
  ]
};

let mockBagReq = {
  id: 'req-shyam-285',
  party_id: 'party-shyam',
  product_type: 'Diamond',
  quantity: 80,
  unit: 'Bags',
  expected_rate: 2150,
  expected_date: '2026-11-27',
  status: 'New',
  priority: 'High',
  intent_type: 'Requirement Confirmed',
  notes: 'Direct factory delivery',
  demand_ref: 'D-285',
  crm_parties: {
    id: 'party-shyam',
    display_name: 'Shyam Baat Bhandar',
    city: 'Kanwarpura',
    mobile: '9829012345'
  },
  requirement_items: [
    {
      id: 'item-285-1',
      requirement_id: 'req-shyam-285',
      product_name: 'Diamond',
      category: 'Pallet',
      quantity: 50,
      unit: 'Bags',
      weight: 45,
      gift: '',
      other_gift: '',
      production_done: false
    },
    {
      id: 'item-285-2',
      requirement_id: 'req-shyam-285',
      product_name: 'Naman',
      category: 'Pallet',
      quantity: 30,
      unit: 'Bags',
      weight: 50,
      gift: 'Bucket',
      other_gift: '',
      production_done: false
    }
  ]
};

async function saveBoth(page, filename) {
  const p1 = path.join(artifactsDir, filename);
  const p2 = path.join(brainArtifactsDir, filename);
  await page.screenshot({ path: p1, fullPage: false });
  fs.copyFileSync(p1, p2);
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  console.log('Starting Vite preview server on port 5198...');
  const server = await preview({
    root: appRoot,
    preview: { port: 5198, host: 'localhost' }
  });

  const baseUrl = `http://localhost:5198`;
  console.log(`Preview server running at ${baseUrl}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const uniqueUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-edit-req-'));

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

    page.on('request', async (req) => {
      const reqUrl = req.url();
      const method = req.method();

      if (method === 'OPTIONS') {
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

        if (reqUrl.includes('products')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockProducts)
          });
          return;
        }

        // Requirements table handling
        if (reqUrl.includes('/rest/v1/requirements')) {
          if (method === 'GET') {
            if (reqUrl.includes('req-yashika-302')) {
              req.respond({
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify(mockYashikaReq)
              });
              return;
            }
            if (reqUrl.includes('req-shyam-285')) {
              req.respond({
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify(mockBagReq)
              });
              return;
            }
          }

          if (method === 'PATCH' || method === 'PUT') {
            const body = JSON.parse(req.postData() || '{}');
            console.log('Intercepted requirements update:', body);
            mockYashikaReq = { ...mockYashikaReq, ...body };
            req.respond({
              status: 200,
              headers: corsHeaders,
              body: JSON.stringify(mockYashikaReq)
            });
            return;
          }
        }

        // Requirement items table handling
        if (reqUrl.includes('/rest/v1/requirement_items')) {
          if (method === 'POST') {
            const items = JSON.parse(req.postData() || '[]');
            console.log('Intercepted requirement_items upsert:', items);
            mockYashikaReq.requirement_items = items.map((it, idx) => ({
              id: it.id || `item-new-${idx}`,
              ...it
            }));
            req.respond({
              status: 200,
              headers: corsHeaders,
              body: JSON.stringify(mockYashikaReq.requirement_items)
            });
            return;
          }

          if (method === 'DELETE') {
            console.log('Intercepted requirement_items DELETE');
            req.respond({
              status: 200,
              headers: corsHeaders,
              body: JSON.stringify([])
            });
            return;
          }
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

    // SNAPSHOT 1: Open Edit Requirement on Yashika Agro (D-302, MT-based multi-product order)
    console.log('Navigating to Edit Requirement for Yashika Agro (D-302)...');
    await page.goto(`${baseUrl}/requirements/req-yashika-302/edit`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    await saveBoth(page, '01_edit_requirement_yashika_multi_product_initial.png');

    // SNAPSHOT 2: Edit a product quantity, packaging weight, and add a product
    console.log('Editing Chana Churi quantity and adding Diamond product...');
    await page.evaluate(() => {
      // Find the first product's quantity input
      const qtyInputs = document.querySelectorAll('input[type="number"]');
      if (qtyInputs[0]) {
        qtyInputs[0].value = '4';
        qtyInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        qtyInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 400));

    // Click "+ Add Product"
    const addProductBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Add Product'));
    });
    if (addProductBtn) {
      await addProductBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }

    // Set 4th product to Diamond, 50 Bags, 45 kg
    await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      const lastSelect = selects[selects.length - 2]; // last product select before unit
      if (lastSelect) {
        lastSelect.value = 'Diamond';
        lastSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const qtyInputs = document.querySelectorAll('input[type="number"]');
      // Set bags to 50
      const lastQtyInput = qtyInputs[qtyInputs.length - 2];
      if (lastQtyInput) {
        lastQtyInput.value = '50';
        lastQtyInput.dispatchEvent(new Event('input', { bubbles: true }));
        lastQtyInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Set weight to 45
      const lastWeightInput = qtyInputs[qtyInputs.length - 1];
      if (lastWeightInput) {
        lastWeightInput.value = '45';
        lastWeightInput.dispatchEvent(new Event('input', { bubbles: true }));
        lastWeightInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 600));

    await saveBoth(page, '02_edit_requirement_recalculated_values.png');

    // SNAPSHOT 3: Open Bag-based order (Shyam Baat Bhandar, D-285)
    console.log('Navigating to Edit Requirement for Shyam Baat Bhandar (D-285)...');
    await page.goto(`${baseUrl}/requirements/req-shyam-285/edit`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    await saveBoth(page, '03_edit_requirement_bag_based_products.png');

    // Click Save Changes to verify save flow
    console.log('Saving changes on Shyam Baat Bhandar...');
    const saveBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.includes('Save Changes'));
    });
    if (saveBtn) {
      await saveBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }

    // Reopen to verify values persist
    console.log('Reopening Shyam Baat Bhandar to verify persistence...');
    await page.goto(`${baseUrl}/requirements/req-shyam-285/edit`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    await saveBoth(page, '04_edit_requirement_reopened_verified.png');

    console.log('All Edit Requirement full mapping snapshots captured successfully!');

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
