import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/customer-access-sort');
const brainArtifactsDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\81a47899-3932-4a28-a500-5d18dac96ab8\\customer-access-sort';

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

const mockCustomers = [
  { id: 'c-1', display_name: 'Arihant Enterprises', legal_or_core_name: 'Arihant Enterprises Pvt Ltd', customer_code: 'CUST-2', mobile: '9829012345', whatsapp: '9829012345', city: 'Medta City', state: 'Rajasthan', crm_status: 'Active' },
  { id: 'c-2', display_name: 'Bajrang Agro Industries', legal_or_core_name: 'Bajrang Agro Industries', customer_code: 'CUST-1', mobile: '9784567890', whatsapp: '9784567890', city: 'Jodhpur', state: 'Rajasthan', crm_status: 'Active' },
  { id: 'c-3', display_name: 'Choudhary Traders', legal_or_core_name: 'Choudhary Traders', customer_code: 'CUST-10', mobile: '9414056789', whatsapp: '9414056789', city: 'Nagaur', state: 'Rajasthan', crm_status: 'Active' },
  { id: 'c-4', display_name: 'Deepak Mills', legal_or_core_name: 'Deepak Flour Mills', customer_code: 'CUST-20', mobile: '9166011223', whatsapp: '9166011223', city: 'Jaipur', state: 'Rajasthan', crm_status: 'Active' },
  { id: 'c-5', display_name: 'Zeta Agro Products', legal_or_core_name: 'Zeta Agro Products', customer_code: '', mobile: '', whatsapp: '', city: 'Kota', state: 'Rajasthan', crm_status: 'Prospect' },
  { id: 'c-6', display_name: 'Apex Feed Store', legal_or_core_name: 'Apex Feed Store', customer_code: 'CUST-5', mobile: '9928099881', whatsapp: '9928099881', city: 'Bikaner', state: 'Rajasthan', crm_status: 'Active' },
  { id: 'c-7', display_name: 'Kisan Seva Kendra', legal_or_core_name: 'Kisan Seva Kendra', customer_code: 'CUST-15', mobile: '9413012344', whatsapp: '9413012344', city: 'Ajmer', state: 'Rajasthan', crm_status: 'Active' },
  { id: 'c-8', display_name: 'Marwar Feeds', legal_or_core_name: 'Marwar Feeds Co', customer_code: '', mobile: '9828001122', whatsapp: '9828001122', city: 'Pali', state: 'Rajasthan', crm_status: 'Active' },
];

const mockBuyerUsers = [
  { id: 'buyer-1', email: 'arihant@buyer.com', display_name: 'Arihant Buyer', role: 'Buyer', crm_party_id: 'c-1', is_active: true },
  { id: 'buyer-2', email: 'bajrang@buyer.com', display_name: 'Bajrang Buyer', role: 'Buyer', crm_party_id: 'c-2', is_active: false },
  { id: 'buyer-3', email: 'choudhary@buyer.com', display_name: 'Choudhary Buyer', role: 'Buyer', crm_party_id: 'c-3', is_active: true },
  { id: 'buyer-6', email: 'apex@buyer.com', display_name: 'Apex Buyer', role: 'Buyer', crm_party_id: 'c-6', is_active: true },
  // c-4, c-5, c-7, c-8 are Pending Access
];

const mockSessions = [
  { session_id: 'sess-1', crm_party_id: 'c-1', is_online: true, app_state: 'active', last_seen_at: new Date().toISOString(), started_at: new Date(Date.now() - 3600000).toISOString() },
  { session_id: 'sess-2', crm_party_id: 'c-3', is_online: false, app_state: 'background', last_seen_at: new Date(Date.now() - 7200000).toISOString(), started_at: new Date(Date.now() - 10000000).toISOString() },
];

async function run() {
  console.log('--- Starting SL-CRM-CUSTOMER-ACCESS-SORT-01 Verification ---');

  const previewPort = 4195;
  const previewServer = await preview({
    root: appRoot,
    preview: { port: previewPort }
  });

  const baseUrl = `http://localhost:${previewPort}`;
  console.log(`Vite preview server running at ${baseUrl}`);

  const uniqueUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-cust-sort-'));
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: uniqueUserDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER CONSOLE ERROR:', msg.text());
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
        if (reqUrl.includes('role=eq.Buyer')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockBuyerUsers)
          });
          return;
        }
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify(mockAdminUser)
        });
        return;
      }

      if (reqUrl.includes('crm_parties')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify(mockCustomers)
        });
        return;
      }

      if (reqUrl.includes('customer_app_sessions')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify(mockSessions)
        });
        return;
      }

      if (reqUrl.includes('crm_settings')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            customer_app_release_config: {
              appVersion: '1.2.0',
              downloadUrl: 'https://shubhlabh.com/download/app.apk'
            }
          })
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

  try {
    console.log('Navigating to Customer App Access page...');
    await page.goto(`${baseUrl}/customer-access`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Verify page loaded
    const title = await page.$eval('h1', el => el.textContent);
    console.log(`Page Title: "${title.trim()}"`);

    // Helper to click table header by text
    const clickHeader = async (headerText) => {
      await page.evaluate((text) => {
        const headers = Array.from(document.querySelectorAll('th'));
        const target = headers.find(th => th.textContent && th.textContent.includes(text));
        if (target) target.click();
      }, headerText);
      await new Promise(r => setTimeout(r, 400));
    };

    // Helper to get first column text of all rows
    const getColumnValues = async (colIndex) => {
      return await page.evaluate((idx) => {
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        return rows.map(r => {
          const cells = r.querySelectorAll('td');
          if (!cells[idx]) return '';
          if (idx === 0) {
            const nameEl = cells[0].querySelector('div');
            return nameEl ? nameEl.textContent.trim() : cells[0].textContent.trim();
          }
          return cells[idx].textContent.trim();
        });
      }, colIndex);
    };

    // 1. Sort by Customer Name Ascending (First Click)
    console.log('Testing 1: Customer Name Ascending...');
    await clickHeader('Customer Name');
    let namesAsc = await getColumnValues(0);
    console.log('Names (Asc):', namesAsc);
    if (namesAsc[0] !== 'Apex Feed Store' || namesAsc[1] !== 'Arihant Enterprises') {
      throw new Error(`Customer Name Ascending failed! First two names: ${namesAsc[0]}, ${namesAsc[1]}`);
    }

    const snap1 = path.join(artifactsDir, '01_customer_name_asc.png');
    const brainSnap1 = path.join(brainArtifactsDir, '01_customer_name_asc.png');
    await page.screenshot({ path: snap1, fullPage: false });
    fs.copyFileSync(snap1, brainSnap1);
    console.log(`Saved snapshot 1: ${snap1}`);

    // 2. Sort by Customer Name Descending (Second Click)
    console.log('Testing 2: Customer Name Descending...');
    await clickHeader('Customer Name');
    let namesDesc = await getColumnValues(0);
    console.log('Names (Desc):', namesDesc);
    if (namesDesc[0] !== 'Zeta Agro Products' || namesDesc[1] !== 'Marwar Feeds') {
      throw new Error(`Customer Name Descending failed! First two names: ${namesDesc[0]}, ${namesDesc[1]}`);
    }

    const snap2 = path.join(artifactsDir, '02_customer_name_desc.png');
    const brainSnap2 = path.join(brainArtifactsDir, '02_customer_name_desc.png');
    await page.screenshot({ path: snap2, fullPage: false });
    fs.copyFileSync(snap2, brainSnap2);
    console.log(`Saved snapshot 2: ${snap2}`);

    // 3. Clear sort by clicking third time (Returns to default)
    console.log('Testing 3: Return to Default order (Third Click)...');
    await clickHeader('Customer Name');
    const activeSortPillAfter3rd = await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('div'));
      return pills.some(p => p.textContent && p.textContent.includes('Sorted:'));
    });
    console.log('Active sort pill present after 3rd click:', activeSortPillAfter3rd);
    if (activeSortPillAfter3rd) {
      throw new Error('Sort did not clear on 3rd click!');
    }

    // 4. Sort by Customer Code Natural Sort (CUST-1, CUST-2, CUST-5, CUST-10, CUST-15, CUST-20, Unassigned at bottom)
    console.log('Testing 4: Customer Code Natural Sort...');
    await clickHeader('Customer Code');
    let codesAsc = await getColumnValues(1);
    console.log('Codes (Asc):', codesAsc);
    if (codesAsc[0] !== 'CUST-1' || codesAsc[1] !== 'CUST-2' || codesAsc[2] !== 'CUST-5' || codesAsc[3] !== 'CUST-10') {
      throw new Error(`Customer Code Natural Sort failed! First 4: ${codesAsc.slice(0, 4).join(', ')}`);
    }
    // Verify Unassigned codes sit at the bottom
    const lastTwoCodes = codesAsc.slice(-2);
    console.log('Last two codes in list (should be Unassigned):', lastTwoCodes);
    if (lastTwoCodes[0] !== 'Unassigned' || lastTwoCodes[1] !== 'Unassigned') {
      throw new Error(`Unassigned codes not at bottom! Last two: ${lastTwoCodes.join(', ')}`);
    }

    const snap3 = path.join(artifactsDir, '03_customer_code_natural_sort.png');
    const brainSnap3 = path.join(brainArtifactsDir, '03_customer_code_natural_sort.png');
    await page.screenshot({ path: snap3, fullPage: false });
    fs.copyFileSync(snap3, brainSnap3);
    console.log(`Saved snapshot 3: ${snap3}`);

    // 5. Sort by Registered Mobile (Missing at bottom)
    console.log('Testing 5: Registered Mobile Sort...');
    await clickHeader('Registered Mobile');
    let mobilesAsc = await getColumnValues(2);
    console.log('Mobiles (Asc):', mobilesAsc);
    const lastMobile = mobilesAsc[mobilesAsc.length - 1];
    console.log('Last mobile (should be No Mobile):', lastMobile);
    if (!lastMobile.includes('No Mobile')) {
      throw new Error(`Missing mobile not at bottom! Last mobile: ${lastMobile}`);
    }

    const snap4 = path.join(artifactsDir, '04_registered_mobile_sorted_missing_bottom.png');
    const brainSnap4 = path.join(brainArtifactsDir, '04_registered_mobile_sorted_missing_bottom.png');
    await page.screenshot({ path: snap4, fullPage: false });
    fs.copyFileSync(snap4, brainSnap4);
    console.log(`Saved snapshot 4: ${snap4}`);

    // 6. Sort by App Status (Active -> Disabled -> Pending Access)
    console.log('Testing 6: App Status Sort...');
    await clickHeader('App Status');
    let statusesAsc = await getColumnValues(3);
    console.log('App Statuses (Asc):', statusesAsc);
    if (!statusesAsc[0].includes('Active') || !statusesAsc[statusesAsc.length - 1].includes('Pending Access')) {
      throw new Error(`App Status sort failed! First: ${statusesAsc[0]}, Last: ${statusesAsc[statusesAsc.length - 1]}`);
    }

    const snap5 = path.join(artifactsDir, '05_app_status_sort.png');
    const brainSnap5 = path.join(brainArtifactsDir, '05_app_status_sort.png');
    await page.screenshot({ path: snap5, fullPage: false });
    fs.copyFileSync(snap5, brainSnap5);
    console.log(`Saved snapshot 5: ${snap5}`);

    // 7. Sort by App Presence (Online -> Offline -> No Account)
    console.log('Testing 7: App Presence Sort...');
    await clickHeader('App Presence');
    let presenceAsc = await getColumnValues(4);
    console.log('Presences (Asc):', presenceAsc);
    if (!presenceAsc[0].includes('Online')) {
      throw new Error(`App Presence sort failed! First presence is not Online: ${presenceAsc[0]}`);
    }

    // 8. Search query combined with Sorting
    console.log('Testing 8: Search Filter Combined with Sorting...');
    // Reset sort to Customer Name Ascending
    await clickHeader('Customer Name');
    // Type search term "Agro"
    const searchInput = await page.$('input[placeholder*="Search by name"]');
    await searchInput.focus();
    await page.keyboard.type('Agro');
    await new Promise(r => setTimeout(r, 600));

    let searchNames = await getColumnValues(0);
    console.log('Filtered and Sorted Names for "Agro":', searchNames);
    if (searchNames.length !== 2 || searchNames[0] !== 'Bajrang Agro Industries' || searchNames[1] !== 'Zeta Agro Products') {
      throw new Error(`Search with sorting failed! Expected 2 Agro companies in alphabetical order, got: ${searchNames.join(', ')}`);
    }

    const snap6 = path.join(artifactsDir, '06_search_and_filter_with_sorting.png');
    const brainSnap6 = path.join(brainArtifactsDir, '06_search_and_filter_with_sorting.png');
    await page.screenshot({ path: snap6, fullPage: false });
    fs.copyFileSync(snap6, brainSnap6);
    console.log(`Saved snapshot 6: ${snap6}`);

    // Clear search
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Search by name"]');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 400));

    // 9. Mobile Responsive Viewport Snapshot
    console.log('Testing 9: Mobile Viewport...');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await new Promise(r => setTimeout(r, 500));

    const snap7 = path.join(artifactsDir, '07_mobile_view_sorting.png');
    const brainSnap7 = path.join(brainArtifactsDir, '07_mobile_view_sorting.png');
    await page.screenshot({ path: snap7, fullPage: false });
    fs.copyFileSync(snap7, brainSnap7);
    console.log(`Saved snapshot 7: ${snap7}`);

    console.log('======================================================');
    console.log('ALL CUSTOMER ACCESS SORTING CHECKS PASSED WITH 100% SUCCESS!');
    console.log('======================================================');
  } finally {
    if (browser) await browser.close();
    if (previewServer?.httpServer) await previewServer.httpServer.close();
    try {
      fs.rmSync(uniqueUserDataDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
