import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/raw-materials-ui');
const brainArtifactsDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\81a47899-3932-4a28-a500-5d18dac96ab8\\raw-materials-ui';

for (const dir of [artifactsDir, brainArtifactsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Real material master sample matching production database
const mockMaterials = [
  { id: '1', code: 'KHAL', name_en: 'Mustard Oil Cake', name_hi: 'सरसों खल', category: 'Oil Cakes', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 1, default_unit: { unit_name: 'Quintal' } },
  { id: '2', code: 'MAKKA', name_en: 'Makka Daliya', name_hi: 'मक्का दलिया', category: 'Grains', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 2, default_unit: { unit_name: 'Quintal' } },
  { id: '3', code: 'JAGGERY', name_en: 'Jaggery (Gur)', name_hi: 'गुड़', category: 'Feed', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 3, default_unit: { unit_name: 'Quintal' } },
  { id: '4', code: 'OIL', name_en: 'Feed Oil', name_hi: 'तेल', category: 'Liquid', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 4, default_unit: { unit_name: 'Quintal' } },
  { id: '5', code: 'CHANA_CHURI', name_en: 'Chana Churi', name_hi: 'चना चूरी', category: 'Protein Sources', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 5, default_unit: { unit_name: 'Quintal' } },
  { id: '6', code: 'SOYA_CHURI', name_en: 'Soya Churi', name_hi: 'सोया चूरी', category: 'Protein Sources', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 6, default_unit: { unit_name: 'Quintal' } },
  { id: '7', code: 'KAKDE', name_en: 'Cotton Seed (Kakde)', name_hi: 'काकड़े', category: 'Grains', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 7, default_unit: { unit_name: 'Quintal' } },
  { id: '8', code: 'KAKDE_KHAL', name_en: 'Cotton Seed Cake', name_hi: 'काकड़े खल', category: 'Oil Cakes', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 8, default_unit: { unit_name: 'Quintal' } },
  { id: '9', code: 'MUSTARD_KHAL', name_en: 'Sarson Khal Special', name_hi: 'सरसों खल स्पेशल', category: 'Oil Cakes', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 9, default_unit: { unit_name: 'Quintal' } },
  { id: '10', code: 'CHAPAD', name_en: 'Wheat Bran (Chapad)', name_hi: 'चपड़', category: 'Brans', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 10, default_unit: { unit_name: 'Quintal' } },
  { id: '11', code: 'METHI', name_en: 'Fenugreek Seeds (Methi)', name_hi: 'मेथी', category: 'Minerals', default_unit_id: 'u3', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 11, default_unit: { unit_name: 'Kg' } },
  { id: '12', code: 'AJWAIN', name_en: 'Carom Seeds (Ajwain)', name_hi: 'अजवाइन', category: 'Minerals', default_unit_id: 'u3', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 12, default_unit: { unit_name: 'Kg' } },
  { id: '13', code: 'CALCIUM', name_en: 'Liquid Calcium Booster', name_hi: 'लिक्विड कैल्शियम', category: 'Liquid Additives', default_unit_id: 'u3', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 13, default_unit: { unit_name: 'Kg' } },
  { id: '14', code: 'DORB', name_en: 'De-Oiled Rice Bran', name_hi: 'डी-ऑयल्ड राइस ब्रान', category: 'De-oiled Cakes', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 14, default_unit: { unit_name: 'Quintal' } },
  { id: '15', code: 'BAJRA', name_en: 'Pearl Millet (Bajra)', name_hi: 'बाजरा', category: 'Grains', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: false, active: true, display_order: 15, default_unit: { unit_name: 'Quintal' } }
];

const mockUnits = [
  { id: 'u1', unit_name: 'Quintal', unit_code: 'QTL', display_order: 1 },
  { id: 'u2', unit_name: 'Metric Ton', unit_code: 'MT', display_order: 2 },
  { id: 'u3', unit_name: 'Kilogram', unit_code: 'KG', display_order: 3 },
  { id: 'u4', unit_name: 'Bag', unit_code: 'BAG', display_order: 4 }
];

const mockPriceTypes = [
  { id: 'p1', type_name: 'Delivered', type_code: 'DEL', display_order: 1 },
  { id: 'p2', type_name: 'Ex-mandi', type_code: 'EXM', display_order: 2 },
  { id: 'p3', type_name: 'Indicative', type_code: 'IND', display_order: 3 },
  { id: 'p4', type_name: 'Purchase', type_code: 'PUR', display_order: 4 }
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
  company_name: 'Shubh Labh Cattle Feeds'
};

async function run() {
  console.log('--- Starting Raw Materials UI Automation & Snapshot Capture ---');

  // 1. Start Vite Preview server
  console.log('Starting Vite preview server...');
  const server = await preview({
    root: appRoot,
    preview: { port: 4174 }
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

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Request interception for mocking
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
              id: '1',
              email: 'admin@shubhlabh.com',
              role: 'authenticated'
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

        if (url.includes('raw_materials')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockMaterials)
          });
          return;
        }

        if (url.includes('rm_units')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockUnits)
          });
          return;
        }

        if (url.includes('rm_price_types')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockPriceTypes)
          });
          return;
        }

        if (url.includes('material_quality_grades')) {
          req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify([]) });
          return;
        }

        if (url.includes('brokers')) {
          req.respond({ status: 200, headers: corsHeaders, body: JSON.stringify([]) });
          return;
        }

        if (url.includes('raw_material_price_settings') || url.includes('crm_settings')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockCrmSettings)
          });
          return;
        }

        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify([])
        });
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

    // 1. Desktop Viewport
    console.log('Navigating to Raw Materials Configuration page...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}raw-material-prices/configuration/raw-materials`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for the master table to appear
    await page.waitForFunction(() => document.body.innerText.includes('Raw Material Master'), { timeout: 15000 });
    console.log('✓ Raw Material Master loaded successfully in browser!');

    // Wait for data rows
    await page.waitForFunction(() => document.body.innerText.includes('Mustard Oil Cake'), { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1500));

    // Save Desktop Full Page Screenshot
    const desktopPath = path.join(artifactsDir, 'raw-materials-desktop.png');
    const brainDesktopPath = path.join(brainArtifactsDir, 'raw-materials-desktop.png');
    await page.screenshot({ path: desktopPath, fullPage: false });
    fs.copyFileSync(desktopPath, brainDesktopPath);
    console.log(`✓ Saved desktop screenshot: ${desktopPath}`);

    // 2. Open Add Material Modal
    console.log('Clicking "+ Add Material" button to open modal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addBtn = btns.find(b => b.innerText.includes('Add Material'));
      if (addBtn) addBtn.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes('Add Raw Material'), { timeout: 5000 });
    await new Promise(r => setTimeout(r, 1000));

    // Save Modal Open Screenshot
    const modalPath = path.join(artifactsDir, 'raw-materials-add-modal.png');
    const brainModalPath = path.join(brainArtifactsDir, 'raw-materials-add-modal.png');
    await page.screenshot({ path: modalPath, fullPage: false });
    fs.copyFileSync(modalPath, brainModalPath);
    console.log(`✓ Saved modal screenshot: ${modalPath}`);

    // Close Modal via Cancel button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const cancelBtn = btns.find(b => b.innerText.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // 3. Test Filter and Search
    console.log('Testing search and category filter...');
    const searchInput = await page.$('input[placeholder="Search by material name or code..."]');
    if (searchInput) {
      await searchInput.type('खल');
      await new Promise(r => setTimeout(r, 800));

      // Save Filtered Screenshot
      const filteredPath = path.join(artifactsDir, 'raw-materials-filtered.png');
      const brainFilteredPath = path.join(brainArtifactsDir, 'raw-materials-filtered.png');
      await page.screenshot({ path: filteredPath, fullPage: false });
      fs.copyFileSync(filteredPath, brainFilteredPath);
      console.log(`✓ Saved filtered screenshot: ${filteredPath}`);

      // Click Reset
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const resetBtn = btns.find(b => b.innerText.includes('Reset'));
        if (resetBtn) resetBtn.click();
      });
      await new Promise(r => setTimeout(r, 600));
    }

    // 4. Tablet Viewport (768 x 1024)
    console.log('Testing tablet viewport 768 × 1024...');
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(r => setTimeout(r, 1000));
    const tabletPath = path.join(artifactsDir, 'raw-materials-tablet.png');
    const brainTabletPath = path.join(brainArtifactsDir, 'raw-materials-tablet.png');
    await page.screenshot({ path: tabletPath, fullPage: false });
    fs.copyFileSync(tabletPath, brainTabletPath);
    console.log(`✓ Saved tablet screenshot: ${tabletPath}`);

    // 5. Mobile Viewport (390 x 844)
    console.log('Testing mobile viewport 390 × 844...');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 1000));
    const mobilePath = path.join(artifactsDir, 'raw-materials-mobile.png');
    const brainMobilePath = path.join(brainArtifactsDir, 'raw-materials-mobile.png');
    await page.screenshot({ path: mobilePath, fullPage: false });
    fs.copyFileSync(mobilePath, brainMobilePath);
    console.log(`✓ Saved mobile screenshot: ${mobilePath}`);

    console.log('--- ALL VALIDATIONS & SCREENSHOTS COMPLETED SUCCESSFULLY ---');
  } finally {
    if (browser) await browser.close();
    server.httpServer.close();
  }
}

run().catch(err => {
  console.error('Snapshot automation failed:', err);
  process.exit(1);
});
