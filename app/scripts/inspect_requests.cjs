const { chromium, devices } = require('playwright');

async function inspectPage(deviceType, deviceConfig) {
  console.log(`\n================ Inspecting ${deviceType} ================`);
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const context = await browser.newContext(deviceConfig || {});
  const page = await context.newPage();

  const requests = [];
  const consoleMessages = [];
  const uncaughtErrors = [];

  page.on('request', req => {
    requests.push({ url: req.url(), method: req.method(), resourceType: req.resourceType() });
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[HTTP ERROR ${res.status()}]: ${res.url()}`);
    }
  });

  page.on('requestfailed', req => {
    console.log(`[REQ FAILED]: ${req.url()} - ${req.failure()?.errorText}`);
  });

  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`[CONSOLE ${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    uncaughtErrors.push(err.stack || err.message);
    console.log('[PAGE ERROR]:', err.stack || err.message);
  });

  try {
    const res = await page.goto('https://www.shubhlabhfeeds.in/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('Status:', res.status());
    console.log('Final URL:', page.url());

    // Check if #root has content
    const rootInfo = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        exists: !!root,
        childElementCount: root ? root.childElementCount : 0,
        innerText: root ? root.innerText.slice(0, 200) : null,
        htmlLength: root ? root.innerHTML.length : 0
      };
    });
    console.log('Root Info:', JSON.stringify(rootInfo, null, 2));
    console.log('Total Requests:', requests.length);
    console.log('Console Messages Count:', consoleMessages.length);
    console.log('Uncaught Errors Count:', uncaughtErrors.length);

  } catch (err) {
    console.error('Error during run:', err);
  } finally {
    await browser.close();
  }
}

async function run() {
  await inspectPage('Desktop Chrome Fresh Profile', {});
  await inspectPage('iPhone 13 Safari', devices['iPhone 13']);
  await inspectPage('Pixel 5 Android', devices['Pixel 5']);
}

run();
