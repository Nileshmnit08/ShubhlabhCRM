const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  console.log('--- TESTING LOCAL LOGIN FOR admin@shubhlabh.com ---');
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
    cwd: path.resolve(__dirname, '..'),
    shell: true,
    stdio: 'pipe'
  });

  let serverStarted = false;
  previewProcess.stdout.on('data', (data) => {
    if (data.toString().includes('http://localhost:4173')) {
      serverStarted = true;
    }
  });

  for (let i = 0; i < 20; i++) {
    if (serverStarted) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const browser = await chromium.launch({ 
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:4173/login?destination=crm...');
  await page.goto('http://localhost:4173/login?destination=crm', { waitUntil: 'networkidle' });

  await page.fill('input[type="email"]', 'admin@shubhlabh.com');
  await page.fill('input[type="password"]', 'password');
  console.log('Submitting login form with admin@shubhlabh.com / password...');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForTimeout(4000);
  console.log('After login URL:', page.url());

  const currentUrl = page.url();
  const heading = await page.locator('h1, h2').allInnerTexts();
  console.log('Headings found:', heading);

  if (currentUrl.includes('/today')) {
    console.log('SUCCESS: Authenticated and navigated to /today dashboard!');
  } else {
    console.log('Current state text snippet:', (await page.innerText('body')).substring(0, 300));
  }

  await browser.close();
  previewProcess.kill();
  try {
    process.kill(-previewProcess.pid);
  } catch (e) {}
})();
