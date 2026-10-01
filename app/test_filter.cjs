const { chromium } = require('playwright');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('=== TEST: CUSTOMER NAME FILTER ON LIVE SITE ===');
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('[1] Navigating to https://shubhlabh-crm.vercel.app/follow-ups');
  await page.goto('https://shubhlabh-crm.vercel.app/follow-ups', { waitUntil: 'networkidle', timeout: 20000 });
  
  // Handle Login if present
  const loginInput = await page.$('input[type="email"], input[name="email"]');
  if (loginInput) {
    console.log('[2] Logging in...');
    await page.fill('input[type="email"]', 'test@shubhlabh.com'); // Put a dummy or check what happens
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(()=>console.log('Nav timeout on login'));
  }

  // Wait for Missed tab to load
  await page.waitForTimeout(2000);
  console.log('[3] Checking Missed Follow-ups tab...');
  const tab = await page.waitForSelector('text="Missed Follow-ups"', { timeout: 10000 });
  await tab.click();
  await page.waitForTimeout(3000); // Wait for data load

  // Type in the missed followups search box
  console.log('[4] Searching for spaces test...');
  const searchInput = await page.$('input[placeholder="Search by name or mobile..."]');
  if (!searchInput) {
    console.log('Search input not found in Missed Followups!');
  } else {
    // Initial count
    let rows = await page.$$('table tbody tr');
    console.log(`  Initial rows: ${rows.length}`);

    // Enter padded string
    await searchInput.fill('  ganesh  ');
    await page.waitForTimeout(1000);
    rows = await page.$$('table tbody tr');
    console.log(`  Rows after searching '  ganesh  ': ${rows.length}`);
    
    // Check if any row contains ganesh (case insensitive)
    if (rows.length > 0) {
      const text = await rows[0].innerText();
      console.log(`  First matching row text preview: ${text.substring(0, 50)}...`);
    } else {
      console.log(`  (Note: Maybe there's no Ganesh in the live DB at all)`);
    }
  }

  console.log('Done.');
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
