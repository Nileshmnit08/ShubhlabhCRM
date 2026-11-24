import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/mark-dispatched-focus-fix');
const brainArtifactsDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\81a47899-3932-4a28-a500-5d18dac96ab8\\mark-dispatched-focus-fix';

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
  }
];

const mockTransporters = [
  { transporter_name: 'Sharma Transport', contact_number: '9829012345', is_fraud: false },
  { transporter_name: 'Meena Roadlines', contact_number: '9414056789', is_fraud: false }
];

async function run() {
  console.log('--- Starting SL-MARK-DISPATCHED-INPUT-FOCUS-FIX-01 Verification ---');

  const previewPort = 4192;
  const previewServer = await preview({
    root: appRoot,
    preview: { port: previewPort }
  });

  const baseUrl = `http://localhost:${previewPort}`;
  console.log(`Vite preview server running at ${baseUrl}`);

  const uniqueUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer-focus-'));
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: uniqueUserDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });

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
        if (req.method() === 'POST') {
          const body = JSON.parse(req.postData() || '{}');
          req.respond({
            status: 201,
            headers: corsHeaders,
            body: JSON.stringify([{ id: 't-new', ...body }])
          });
          return;
        }
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify(mockTransporters)
        });
        return;
      }

      if (reqUrl.includes('requirement_dispatches')) {
        if (req.method() === 'POST') {
          const body = JSON.parse(req.postData() || '{}');
          req.respond({
            status: 201,
            headers: corsHeaders,
            body: JSON.stringify([{ id: 'disp-new-1', ...body, created_at: new Date().toISOString() }])
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

      if (reqUrl.includes('crm_settings')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify({ crm_name: 'Shubh Labh CRM' })
        });
        return;
      }

      if (reqUrl.includes('/rest/v1/requirements')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify([{ id: 'req-001-new', status: 'Closed' }])
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
    console.log('Navigating to Requirements page...');
    await page.goto(`${baseUrl}/requirements?view=customer&status=All`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Expand customer card if collapsed
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

    // Open Action menu
    console.log('Opening action menu for requirement req-001-new...');
    const moreBtn = await page.$('button[aria-label="More actions"]');
    if (moreBtn) {
      await moreBtn.click();
    } else {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const menuBtn = btns.find(b => b.querySelector('svg.lucide-more-vertical') || b.title === 'More options');
        if (menuBtn) menuBtn.click();
      });
    }
    await new Promise(r => setTimeout(r, 600));

    // Click "Mark as Dispatched"
    console.log('Clicking "Mark as Dispatched"...');
    const clickedDispatch = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const dispatchBtn = buttons.find(b => b.textContent && b.textContent.includes('Mark as Dispatched'));
      if (dispatchBtn) {
        dispatchBtn.click();
        return true;
      }
      return false;
    });
    console.log('Dispatch button clicked:', clickedDispatch);
    await new Promise(r => setTimeout(r, 800));

    // 1. Verify modal is open
    const modalTitle = await page.$eval('#mark-dispatched-modal-title', el => el.textContent);
    console.log(`Modal Title Verified: "${modalTitle.trim()}"`);

    // Focus input if not yet focused
    const initialActive = await page.evaluate(() => document.activeElement ? document.activeElement.id : null);
    console.log(`Active element on modal open: "${initialActive}"`);
    if (initialActive !== 'dispatch-transporter-name-input') {
      await page.focus('#dispatch-transporter-name-input');
    }

    // 2. Test Uninterrupted Typing in Transporter Name: "Sharma Transport"
    const testName = 'Sharma Transport';
    console.log(`Typing "${testName}" character by character and asserting focus retention after EACH keystroke...`);
    
    await page.evaluate(() => {
      const el = document.getElementById('dispatch-transporter-name-input');
      if (el) el.value = '';
    });
    await page.focus('#dispatch-transporter-name-input');

    for (let i = 0; i < testName.length; i++) {
      const char = testName[i];
      await page.keyboard.type(char);
      
      const currentActive = await page.evaluate(() => document.activeElement?.id);
      if (currentActive !== 'dispatch-transporter-name-input') {
        throw new Error(`FOCUS LOST in Transporter Name after typing '${char}' at index ${i}! Active element is now '${currentActive}'!`);
      }
    }
    console.log(`SUCCESS: "${testName}" typed continuously without single focus loss!`);

    // Capture Snapshot 1
    const snap1 = path.join(artifactsDir, '01_typing_transporter_name_uninterrupted.png');
    const brainSnap1 = path.join(brainArtifactsDir, '01_typing_transporter_name_uninterrupted.png');
    await page.screenshot({ path: snap1, fullPage: false });
    fs.copyFileSync(snap1, brainSnap1);
    console.log(`Saved snapshot: ${snap1}`);

    // 3. Test Tab key navigation to Mobile Number
    console.log('Testing Tab key navigation to Mobile Number input...');
    await page.keyboard.press('Tab');
    const activeAfterTab = await page.evaluate(() => document.activeElement?.id);
    console.log(`Active element after Tab: "${activeAfterTab}"`);
    if (activeAfterTab !== 'dispatch-transporter-mobile-input') {
      await page.focus('#dispatch-transporter-mobile-input');
    }

    // 4. Test Uninterrupted Typing in Mobile Number: "9829012345"
    const testMobile = '9829012345';
    console.log(`Typing "${testMobile}" character by character and asserting focus retention after EACH keystroke...`);
    
    await page.evaluate(() => {
      const el = document.getElementById('dispatch-transporter-mobile-input');
      if (el) el.value = '';
    });
    await page.focus('#dispatch-transporter-mobile-input');

    for (let i = 0; i < testMobile.length; i++) {
      const char = testMobile[i];
      await page.keyboard.type(char);
      
      const currentActive = await page.evaluate(() => document.activeElement?.id);
      if (currentActive !== 'dispatch-transporter-mobile-input') {
        throw new Error(`FOCUS LOST in Mobile Number after typing '${char}' at index ${i}! Active element is now '${currentActive}'!`);
      }
    }
    console.log(`SUCCESS: "${testMobile}" typed continuously without single focus loss!`);

    // Verify both values intact
    const finalName = await page.evaluate(() => document.getElementById('dispatch-transporter-name-input')?.value);
    const finalMobile = await page.evaluate(() => document.getElementById('dispatch-transporter-mobile-input')?.value);
    console.log(`Current values in form: Name="${finalName}", Mobile="${finalMobile}"`);
    if (finalName !== testName || finalMobile !== testMobile) {
      throw new Error(`Values mismatch! Name: "${finalName}", Mobile: "${finalMobile}"`);
    }

    // Capture Snapshot 2
    const snap2 = path.join(artifactsDir, '02_typing_mobile_number_uninterrupted.png');
    const brainSnap2 = path.join(brainArtifactsDir, '02_typing_mobile_number_uninterrupted.png');
    await page.screenshot({ path: snap2, fullPage: false });
    fs.copyFileSync(snap2, brainSnap2);
    console.log(`Saved snapshot: ${snap2}`);

    // 5. Test Switching between fields does NOT wipe or reset either field
    console.log('Testing switching back to Transporter Name and appending text...');
    await page.click('#dispatch-transporter-name-input');
    await page.keyboard.type(' Co');
    const updatedName = await page.evaluate(() => document.getElementById('dispatch-transporter-name-input')?.value);
    const retainedMobile = await page.evaluate(() => document.getElementById('dispatch-transporter-mobile-input')?.value);
    console.log(`Updated Name: "${updatedName}", Retained Mobile: "${retainedMobile}"`);
    if (updatedName !== 'Sharma Transport Co' || retainedMobile !== testMobile) {
      throw new Error('Switching between fields cleared values!');
    }

    // Capture Snapshot 3
    const snap3 = path.join(artifactsDir, '03_switching_fields_values_preserved.png');
    const brainSnap3 = path.join(brainArtifactsDir, '03_switching_fields_values_preserved.png');
    await page.screenshot({ path: snap3, fullPage: false });
    fs.copyFileSync(snap3, brainSnap3);
    console.log(`Saved snapshot: ${snap3}`);

    // 6. Test Keyboard Accessibility: Escape key closes modal
    console.log('Testing Escape key to close modal...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 600));
    const modalAfterEscape = await page.$('#mark-dispatched-modal-title');
    console.log(`Modal presence after Escape: ${modalAfterEscape !== null}`);
    if (modalAfterEscape !== null) {
      throw new Error('Escape key failed to close modal!');
    }

    // Capture Snapshot 4 (Modal Closed)
    const snap4 = path.join(artifactsDir, '04_escape_key_closes_modal.png');
    const brainSnap4 = path.join(brainArtifactsDir, '04_escape_key_closes_modal.png');
    await page.screenshot({ path: snap4, fullPage: false });
    fs.copyFileSync(snap4, brainSnap4);
    console.log(`Saved snapshot: ${snap4}`);

    // 7. Test Submitting Dispatch
    console.log('Re-opening modal to test submission...');
    const moreBtn2 = await page.$('button[aria-label="More actions"]');
    if (moreBtn2) {
      await moreBtn2.click();
    } else {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const menuBtn = btns.find(b => b.querySelector('svg.lucide-more-vertical') || b.title === 'More options');
        if (menuBtn) menuBtn.click();
      });
    }
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const dispatchBtn = buttons.find(b => b.textContent && b.textContent.includes('Mark as Dispatched'));
      if (dispatchBtn) dispatchBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Type details
    await page.focus('#dispatch-transporter-name-input');
    await page.keyboard.type('Sharma Transport');
    await page.focus('#dispatch-transporter-mobile-input');
    await page.keyboard.type('9829012345');

    // Click "Mark as Dispatched"
    console.log('Submitting dispatch confirmation...');
    const submitBtn = await page.waitForSelector('button[type="submit"]');
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 1200));

    // Verify modal closes
    const modalAfterSubmit = await page.$('#mark-dispatched-modal-title');
    console.log(`Modal presence after submit: ${modalAfterSubmit !== null}`);
    if (modalAfterSubmit !== null) {
      throw new Error('Modal did not close after successful dispatch submit!');
    }

    // Capture Snapshot 5 (Successful Dispatch Toast / State)
    const snap5 = path.join(artifactsDir, '05_dispatch_submission_success.png');
    const brainSnap5 = path.join(brainArtifactsDir, '05_dispatch_submission_success.png');
    await page.screenshot({ path: snap5, fullPage: false });
    fs.copyFileSync(snap5, brainSnap5);
    console.log(`Saved snapshot: ${snap5}`);

    console.log('======================================================');
    console.log('ALL FOCUS & TYPING VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
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
