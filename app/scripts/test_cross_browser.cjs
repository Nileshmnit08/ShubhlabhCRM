const { chromium, firefox, webkit } = require('playwright');

async function testBrowser(name, browserType, options = {}) {
  console.log(`\n================ Testing ${name} ================`);
  let browser;
  try {
    browser = await browserType.launch({ headless: true, ...options });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleMsgs = [];
    const uncaughtErrors = [];
    const failedRequests = [];

    page.on('console', msg => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => uncaughtErrors.push(err.stack || err.message));
    page.on('requestfailed', req => failedRequests.push(`${req.url()} (${req.failure()?.errorText})`));

    const response = await page.goto('https://www.shubhlabhfeeds.in/', {
      waitUntil: 'load',
      timeout: 30000
    });

    await page.waitForTimeout(4000);

    const rootContent = await page.evaluate(() => {
      const el = document.getElementById('root');
      return el ? el.innerHTML : null;
    });

    console.log(`HTTP Status: ${response.status()}`);
    console.log(`Root innerHTML length: ${rootContent ? rootContent.length : 'NULL'}`);
    console.log(`Uncaught page errors (${uncaughtErrors.length}):`, uncaughtErrors);
    console.log(`Console messages (${consoleMsgs.length}):`, consoleMsgs.slice(0, 10));
    console.log(`Failed requests (${failedRequests.length}):`, failedRequests);

    await page.screenshot({ path: `d:/ShubhLabhCRM/screenshots/live_${name.toLowerCase()}.png`, fullPage: true });
    console.log(`Screenshot saved: live_${name.toLowerCase()}.png`);
  } catch (err) {
    console.error(`Error in ${name}:`, err.message);
  } finally {
    if (browser) await browser.close();
  }
}

async function run() {
  await testBrowser('Firefox', firefox);
  await testBrowser('WebKit (Safari)', webkit);
  await testBrowser('Chromium_Mobile', chromium, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
}

run();
