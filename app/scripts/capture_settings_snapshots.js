import { preview } from 'vite';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const artifactsDir = path.resolve(appRoot, '../artifacts/settings-ui');

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

// Mock Team data matching real database and user design reference
const mockTeam = [
  {
    id: '1',
    display_name: 'Admin',
    email: 'admin@shubhlabh.com',
    role: 'Admin',
    is_active: true,
    whatsapp: null,
    contact_details: ''
  },
  {
    id: '2',
    display_name: 'Vishnu Khandelwal',
    email: 'vishnu@shubhlabh.com',
    role: 'Operations',
    is_active: true,
    whatsapp: '+91 98285 39054',
    contact_details: ''
  },
  {
    id: '3',
    display_name: 'Pradeep Khandelwal',
    email: 'pradeep@shubhlabh.com',
    role: 'Production',
    is_active: true,
    whatsapp: '+91 94144 46444',
    contact_details: ''
  },
  {
    id: '4',
    display_name: 'Vijay Khandelwal',
    email: 'vijay@shubhlabh.com',
    role: 'Sales',
    is_active: true,
    whatsapp: '+91 99281 92696',
    contact_details: ''
  }
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
  company_name: 'Shubh Labh Cattle Feeds',
  app_logo_url: '',
  default_reminder_minutes: 15,
  work_hours_start: '09:00:00',
  work_hours_end: '18:00:00'
};

async function run() {
  console.log('--- Starting Settings UI Automation & Validation ---');

  // 1. Start Vite Preview server
  console.log('Starting Vite preview server...');
  const server = await preview({
    root: appRoot,
    preview: { port: 4173 }
  });
  const baseUrl = server.resolvedUrls.local[0];
  console.log(`Vite preview running at ${baseUrl}`);

  let browser;
  try {
    // 2. Launch Puppeteer with system Chrome
    console.log('Launching system Chrome browser...');
    browser = await puppeteer.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // 3. Setup Request Interception to Mock Supabase & Auth with full CORS headers
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
          req.respond({
            status: 204,
            headers: corsHeaders
          });
          return;
        }

        if (url.includes('auth/v1/user') || url.includes('auth/v1/session')) {
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
          if (url.includes('id=eq.')) {
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
            body: JSON.stringify(mockTeam)
          });
          return;
        }

        if (url.includes('crm_settings')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify(mockCrmSettings)
          });
          return;
        }

        if (url.includes('crm_notifications') || url.includes('whatsapp_templates')) {
          req.respond({
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify([])
          });
          return;
        }

        // Generic mock for other tables
        req.respond({
          status: 200,
          headers: corsHeaders,
          body: JSON.stringify([])
        });
        return;
      }

      req.continue();
    });

    // 4. Inject Admin Auth Session in localStorage before document load
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

    // 5. Navigate to Settings page with Team Management active
    console.log('Navigating to Settings page with tab=team...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}settings?tab=team`, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Navigated URL is:', page.url());
    console.log('Page Title is:', await page.title());

    // Wait for Team Management to render
    await page.waitForSelector('.settings-workspace', { timeout: 10000 });
    await page.waitForFunction(() => document.body.innerText.includes('Team Management'), { timeout: 10000 });

    console.log('Settings page loaded successfully in browser!');

    // ─────────────────────────────────────────────────────────────────────────
    // FUNCTIONAL VALIDATION 1: Tab Navigation & Routing
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Testing horizontal tab navigation...');
    const tabButtons = await page.$$('.horizontal-tabs-container button');
    console.log(`Found ${tabButtons.length} horizontal tabs.`);
    if (tabButtons.length !== 9) {
      throw new Error(`Expected exactly 9 horizontal tabs, but found ${tabButtons.length}`);
    }

    // Click Profile tab
    await tabButtons[0].click();
    await page.waitForFunction(() => document.body.innerText.includes('Personal Profile'));
    let currentUrl = page.url();
    if (!currentUrl.includes('tab=profile')) {
      throw new Error(`Expected URL to include tab=profile, but got ${currentUrl}`);
    }
    console.log('✓ Tab Profile clicked and URL updated to ?tab=profile');

    // Click Security tab
    await tabButtons[1].click();
    await page.waitForFunction(() => document.body.innerText.includes('Account Security & Password'));
    currentUrl = page.url();
    if (!currentUrl.includes('tab=security')) {
      throw new Error(`Expected URL to include tab=security, but got ${currentUrl}`);
    }
    console.log('✓ Tab Security clicked and URL updated to ?tab=security');

    // Test Browser Back and Forward
    await page.goBack();
    await page.waitForFunction(() => document.body.innerText.includes('Personal Profile'));
    console.log('✓ Browser Back returned to Profile tab');

    await page.goForward();
    await page.waitForFunction(() => document.body.innerText.includes('Account Security & Password'));
    console.log('✓ Browser Forward returned to Security tab');

    // Return to Team Management tab
    const teamTab = tabButtons[6];
    await teamTab.click();
    await page.waitForFunction(() => document.body.innerText.includes('Team Management'));
    console.log('✓ Switched back to Team Management tab');

    // ─────────────────────────────────────────────────────────────────────────
    // FUNCTIONAL VALIDATION 2: Team Filter & Search
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Testing team search filtering in real browser DOM...');
    const searchInput = await page.$('input[placeholder*="Search by name"]');
    if (!searchInput) throw new Error('Search input not found!');

    await searchInput.type('Vishnu');
    await new Promise(r => setTimeout(r, 200));

    const rowsCountAfterSearch = await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      return rows.length;
    });
    console.log(`Filtered rows for "Vishnu": ${rowsCountAfterSearch}`);
    if (rowsCountAfterSearch !== 1) {
      throw new Error(`Expected 1 row for "Vishnu", got ${rowsCountAfterSearch}`);
    }

    // Clear search
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Search by name"]');
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 200));

    // ─────────────────────────────────────────────────────────────────────────
    // SCREENSHOT CAPTURE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Capturing required screenshots...');

    // 1. Desktop full page (1440 × 900)
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 300));
    const desktopPath = path.resolve(artifactsDir, 'settings-after-desktop.png');
    await page.screenshot({ path: desktopPath, fullPage: false });
    console.log(`Saved: ${desktopPath}`);

    // 2. Full Team Management workspace card
    const teamCard = await page.$('.settings-workspace > div:last-child > div');
    const teamManagementPath = path.resolve(artifactsDir, 'settings-team-management.png');
    if (teamCard) {
      await teamCard.screenshot({ path: teamManagementPath });
    } else {
      await page.screenshot({ path: teamManagementPath });
    }
    console.log(`Saved: ${teamManagementPath}`);

    // 3. Horizontal settings tabs view
    const tabsContainer = await page.$('.horizontal-tabs-container');
    const tabsPath = path.resolve(artifactsDir, 'settings-horizontal-tabs.png');
    if (tabsContainer) {
      await tabsContainer.screenshot({ path: tabsPath });
    } else {
      await page.screenshot({ path: tabsPath });
    }
    console.log(`Saved: ${tabsPath}`);

    // 4. Tablet rendering (768 × 1024)
    console.log('Testing tablet viewport 768 × 1024...');
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(r => setTimeout(r, 300));
    const tabletPath = path.resolve(artifactsDir, 'settings-tablet.png');
    await page.screenshot({ path: tabletPath, fullPage: false });
    console.log(`Saved: ${tabletPath}`);

    // 5. Mobile rendering (390 × 844)
    console.log('Testing mobile viewport 390 × 844...');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 300));
    const mobilePath = path.resolve(artifactsDir, 'settings-mobile.png');
    await page.screenshot({ path: mobilePath, fullPage: false });
    console.log(`Saved: ${mobilePath}`);

    console.log('--- ALL VALIDATIONS & SCREENSHOTS COMPLETED SUCCESSFULLY ---');

  } finally {
    if (browser) await browser.close();
    server.httpServer.close();
  }
}

run().catch(err => {
  console.error('Snapshot script failed:', err);
  process.exit(1);
});
