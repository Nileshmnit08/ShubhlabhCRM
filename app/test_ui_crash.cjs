const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE CRASH:', error.message);
  });

  try {
    await page.goto('http://localhost:5173/field-mobility', { waitUntil: 'networkidle' });
    
    // Login if necessary
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.fill('test@shubhlabh.com');
      await page.fill('input[type="password"]', 'Test!1234');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/field-mobility', { waitUntil: 'networkidle' });
    }

    // Wait for the table to load
    await page.waitForSelector('.font-medium', { timeout: 10000 });
    
    // Get all staff elements
    const staffElements = await page.$$('.font-medium');
    console.log(`Found ${staffElements.length} staff members.`);

    if (staffElements.length > 0) {
      // Click the first one
      console.log('Clicking the first staff member...');
      await staffElements[0].click();
      
      // Wait for the drawer
      await page.waitForTimeout(2000);
      console.log('First click done.');

      // Click the second one
      if (staffElements.length > 1) {
        console.log('Clicking the second staff member...');
        await staffElements[1].click();
        await page.waitForTimeout(2000);
        console.log('Second click done.');
      }
    }
    
  } catch (err) {
    console.log('TEST SCRIPT ERROR:', err);
  } finally {
    await browser.close();
  }
})();
