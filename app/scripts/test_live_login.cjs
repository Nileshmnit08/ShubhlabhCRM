const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText));

  console.log('--- TEST A: Trying live production https://shubhlabh-crm.vercel.app/ ---');
  await page.goto('https://shubhlabh-crm.vercel.app/', { waitUntil: 'networkidle' });
  console.log('Loaded URL:', page.url());

  const hasEmail = await page.locator('input[type="email"]').count();
  console.log('Has email input:', hasEmail);

  if (hasEmail > 0) {
    await page.fill('input[type="email"]', 'admin@shubhlabh.com');
    await page.fill('input[type="password"]', 'password');
    console.log('Filled credentials. Submitting form...');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(4000);
    console.log('After submit URL:', page.url());
    const bodyText = await page.innerText('body');
    console.log('Body snippet:\n', bodyText.substring(0, 500));
  }

  await browser.close();
})();
