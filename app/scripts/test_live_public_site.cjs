const { chromium } = require('playwright');

async function testLiveSite() {
  console.log('Testing live site: https://www.shubhlabhfeeds.in/');
  
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const networkErrors = [];
  const responses = [];

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.log('[BROWSER UNCAUGHT ERROR]:', err.stack || err.message);
  });

  page.on('requestfailed', req => {
    networkErrors.push({ url: req.url(), failure: req.failure() });
    console.log('[NETWORK FAILED]:', req.url(), req.failure());
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      responses.push({ url: res.url(), status: res.status() });
      console.log(`[HTTP ${res.status()}]:`, res.url());
    }
  });

  try {
    const response = await page.goto('https://www.shubhlabhfeeds.in/', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    console.log('Main document status:', response.status());
    console.log('Final URL:', page.url());

    // Wait 5 seconds to let everything settle
    await page.waitForTimeout(5000);

    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    console.log('Body innerHTML length:', bodyHtml.length);
    
    const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || 'NO ROOT ELEMENT');
    console.log('Root element innerHTML length:', rootHtml.length);
    console.log('Root element innerHTML snippet (first 300 chars):', rootHtml.slice(0, 300));

    await page.screenshot({ path: 'd:/ShubhLabhCRM/screenshots/live_diagnostic.png', fullPage: true });
    console.log('Screenshot saved to d:/ShubhLabhCRM/screenshots/live_diagnostic.png');

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
}

testLiveSite();
