import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/labour-approval-delete-row');
const brainArtifactsDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\81a47899-3932-4a28-a500-5d18dac96ab8\\labour-approval-delete-row';

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
};

const mockContractors = [
  { id: 'c-1', name: 'Ajay Labour Contractor', is_active: true },
  { id: 'c-2', name: 'Sharma Associates', is_active: true },
];

let mockRegisters = [
  {
    id: 'reg-1',
    contractor_id: 'c-1',
    contractor_name: 'Ajay Labour Contractor',
    work_date: '2026-11-25',
    status: 'Pending',
    revision: 1,
    entry_count: 3,
    labourer_count: 4,
    total_bags: 180,
    total_amount: 3780.00,
    created_at: '2026-11-25T05:00:00Z',
    updated_at: '2026-11-25T05:00:00Z',
  }
];

let mockEntries = [
  {
    id: 'entry-1',
    work_date: '2026-11-25',
    contractor_id: 'c-1',
    work_type: 'pallet',
    rate_snapshot: '21.00',
    rate_unit_snapshot: 'bag',
    total_weight_kg: '5000.00',
    total_bags: 100,
    total_batches: 0,
    calculated_labour_amount: '2100.00',
    notes: 'Morning shift palletizing',
    recorded_at: '2026-11-25T04:30:00Z',
    work_completed_at: '2026-11-25T04:00:00Z',
    created_at: '2026-11-25T04:35:00Z',
    updated_at: null,
    created_by: 'usr-admin-1',
    updated_by: null,
  },
  {
    id: 'entry-2',
    work_date: '2026-11-25',
    contractor_id: 'c-1',
    work_type: 'mix',
    rate_snapshot: '18.00',
    rate_unit_snapshot: 'bag',
    total_weight_kg: '2500.00',
    total_bags: 50,
    total_batches: 2,
    calculated_labour_amount: '900.00',
    notes: 'Dry mix batching',
    recorded_at: '2026-11-25T06:30:00Z',
    work_completed_at: '2026-11-25T06:00:00Z',
    created_at: '2026-11-25T06:35:00Z',
    updated_at: null,
    created_by: 'usr-admin-1',
    updated_by: null,
  },
  {
    id: 'entry-3',
    work_date: '2026-11-25',
    contractor_id: 'c-1',
    work_type: 'premix',
    rate_snapshot: '26.00',
    rate_unit_snapshot: 'bag',
    total_weight_kg: '1500.00',
    total_bags: 30,
    total_batches: 1,
    calculated_labour_amount: '780.00',
    notes: 'Premix line B (Incorrect entry to be deleted)',
    recorded_at: '2026-11-25T07:30:00Z',
    work_completed_at: '2026-11-25T07:00:00Z',
    created_at: '2026-11-25T07:35:00Z',
    updated_at: null,
    created_by: 'usr-admin-1',
    updated_by: null,
  }
];

let mockLines = [
  { work_entry_id: 'entry-1', contractor_id: 'c-1', work_date: '2026-11-25', labourer_id: 'lab-1', labourer_name: 'Ramesh Kumar', allocated_amount: '1050.00' },
  { work_entry_id: 'entry-1', contractor_id: 'c-1', work_date: '2026-11-25', labourer_id: 'lab-2', labourer_name: 'Suresh Gurjar', allocated_amount: '1050.00' },
  { work_entry_id: 'entry-2', contractor_id: 'c-1', work_date: '2026-11-25', labourer_id: 'lab-3', labourer_name: 'Mahesh Verma', allocated_amount: '900.00' },
  { work_entry_id: 'entry-3', contractor_id: 'c-1', work_date: '2026-11-25', labourer_id: 'lab-4', labourer_name: 'Dinesh Meena', allocated_amount: '780.00' },
];

let mockEvents = [
  { id: 'ev-1', register_id: 'reg-1', action: 'Created', from_status: null, to_status: 'Pending', revision: 1, reason: null, actor: 'usr-admin-1', at: '2026-11-25T05:00:00Z' }
];

async function run() {
  console.log('--- Starting LH-APPROVAL-DELETE-ROW-01 Verification ---');

  const previewPort = 4199;
  const previewServer = await preview({
    root: appRoot,
    preview: { port: previewPort, host: 'localhost' }
  });

  const baseUrl = `http://localhost:${previewPort}`;
  console.log(`Vite preview server running at ${baseUrl}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-debugging-port=0']
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
        const accept = req.headers()['accept'] || '';
        if (accept.includes('vnd.pgrst.object+json') || reqUrl.includes('id=eq.')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockAdminUser)
          });
          return;
        }
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify([mockAdminUser])
        });
        return;
      }

      if (reqUrl.includes('crm_settings')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify([{ id: 'crm-1', currency: 'INR' }])
        });
        return;
      }

      if (reqUrl.includes('/rpc/lh_admin_delete_work_entry')) {
        const postData = JSON.parse(req.postData() || '{}');
        console.log('Received lh_admin_delete_work_entry RPC call:', postData);
        const deletedId = postData.p_id;
        mockEntries = mockEntries.filter(e => e.id !== deletedId);
        mockLines = mockLines.filter(l => l.work_entry_id !== deletedId);
        mockRegisters[0].revision += 1;
        mockRegisters[0].entry_count = mockEntries.length;
        mockRegisters[0].labourer_count = new Set(mockLines.map(l => l.labourer_id)).size;
        mockRegisters[0].total_bags = mockEntries.reduce((s, e) => s + e.total_bags, 0);
        mockRegisters[0].total_amount = mockEntries.reduce((s, e) => s + Number(e.calculated_labour_amount), 0);
        mockEvents.push({
          id: `ev-${Date.now()}`,
          register_id: 'reg-1',
          action: 'Reopened',
          from_status: 'Pending',
          to_status: 'Pending',
          revision: mockRegisters[0].revision,
          reason: postData.p_reason,
          actor: 'usr-admin-1',
          at: new Date().toISOString()
        });
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true })
        });
        return;
      }

      if (reqUrl.includes('contractors')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify(mockContractors)
        });
        return;
      }

      if (reqUrl.includes('v_lh_daily_registers')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify(mockRegisters)
        });
        return;
      }

      if (reqUrl.includes('daily_work_entries')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify(mockEntries)
        });
        return;
      }

      if (reqUrl.includes('v_labour_work_lines')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify(mockLines)
        });
        return;
      }

      if (reqUrl.includes('labour_daily_register_events')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify(mockEvents)
        });
        return;
      }

      if (reqUrl.includes('labour_daily_register_snapshots')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify([])
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

  // Inject session into localStorage
  await page.evaluateOnNewDocument((user) => {
    const sessionKey = 'sb-fwkjddflpzkowlawkmka-auth-token';
    const sessionData = {
      access_token: 'fake-jwt-token-admin',
      refresh_token: 'fake-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
      token_type: 'bearer',
      user: {
        id: user.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: user.email,
        user_metadata: { role: 'Admin', display_name: user.display_name },
        app_metadata: { provider: 'email' }
      }
    };
    window.localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    window.localStorage.setItem('sb-test-auth-token', JSON.stringify(sessionData));
    window.localStorage.setItem('sl_crm_user', JSON.stringify(user));
  }, mockAdminUser);

  // Navigate to Labour register approvals
  console.log('Navigating to Labour register approvals...');
  await page.goto(`${baseUrl}/labour-hisaab/approvals`, { waitUntil: 'networkidle0' });
  console.log('Current page URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body text snippet:', bodyText.slice(0, 300));
  await page.waitForSelector('h1', { timeout: 10000 });

  // Open the first register
  console.log('Opening register detail...');
  await page.waitForFunction(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.some(b => b.textContent.includes('Review'));
  }, { timeout: 10000 });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Review'));
    if (btn) btn.click();
  });
  await page.waitForFunction(() => document.querySelector('button[aria-label*="Delete"]') !== null, { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  // Screenshot 1: Action column with trash icon
  console.log('Capturing Screenshot 1: approvals action column with trash icon...');
  const shot1Paths = [
    path.join(artifactsDir, '01_approvals_action_column_with_trash_icon.png'),
    path.join(brainArtifactsDir, '01_approvals_action_column_with_trash_icon.png')
  ];
  const shot1Buffer = await page.screenshot({ fullPage: false });
  for (const p of shot1Paths) fs.writeFileSync(p, shot1Buffer);

  // Screenshot 2: Click delete button on the 3rd row (Premix entry)
  console.log('Clicking delete on 3rd entry...');
  const deleteButtons = await page.$$('button[aria-label*="Delete"]');
  console.log(`Found ${deleteButtons.length} delete buttons`);
  if (deleteButtons.length >= 3) {
    await deleteButtons[2].click();
  } else if (deleteButtons.length > 0) {
    await deleteButtons[0].click();
  }
  await page.waitForSelector('[role="dialog"][aria-label="Confirm entry deletion"]');
  await new Promise(r => setTimeout(r, 500));

  console.log('Capturing Screenshot 2: delete confirmation modal...');
  const shot2Paths = [
    path.join(artifactsDir, '02_delete_confirmation_modal.png'),
    path.join(brainArtifactsDir, '02_delete_confirmation_modal.png')
  ];
  const shot2Buffer = await page.screenshot({ fullPage: false });
  for (const p of shot2Paths) fs.writeFileSync(p, shot2Buffer);

  // Screenshot 3: Confirm deletion and capture recalculated totals
  console.log('Clicking Delete Entry button...');
  await page.waitForFunction(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.some(b => b.textContent.includes('Delete Entry'));
  }, { timeout: 10000 });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Delete Entry'));
    if (btn) btn.click();
  });

  // Wait for success notice and recalculation
  await page.waitForFunction(() => document.body.innerText.includes('Work entry deleted successfully'));
  await new Promise(r => setTimeout(r, 800));

  console.log('Capturing Screenshot 3: recalculated totals after delete...');
  const shot3Paths = [
    path.join(artifactsDir, '03_recalculated_totals_after_delete.png'),
    path.join(brainArtifactsDir, '03_recalculated_totals_after_delete.png')
  ];
  const shot3Buffer = await page.screenshot({ fullPage: false });
  for (const p of shot3Paths) fs.writeFileSync(p, shot3Buffer);

    console.log('All screenshots captured successfully!');
  } finally {
    if (browser) await browser.close();
    await previewServer.close();
  }
}

run().catch(err => {
  console.error('Error during execution:', err);
  process.exit(1);
});
