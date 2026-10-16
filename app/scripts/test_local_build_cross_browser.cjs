const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const distDir = path.join(__dirname, '..', 'dist');

// 1. Simple static file server serving dist/
function startServer(port = 4174) {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.json': 'application/json'
    };

    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      let filePath = path.join(distDir, reqPath === '/' ? 'index.html' : reqPath);

      // SPA fallback
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        filePath = path.join(distDir, 'index.html');
      }

      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (e) {
        res.writeHead(500);
        res.end(e.message);
      }
    });

    server.listen(port, () => {
      console.log(`[Preview Server] Serving dist/ on http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function testScenario(browser, name, url, options = {}) {
  const context = await browser.newContext(options.contextOptions || {});
  const page = await context.newPage();

  if (options.initScript) {
    await page.addInitScript(options.initScript);
  }

  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', (err) => errors.push(err.message || String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    const res = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    // Wait for React hydration / render
    await page.waitForTimeout(1500);

    const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
    const title = await page.title();

    const passed = errors.length === 0 && rootHtml.length > 500;
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}`);
    console.log(`       Status: ${res?.status()} | Title: "${title}" | Root Length: ${rootHtml.length}`);
    if (errors.length > 0) console.log(`       Errors:`, errors);
    if (consoleErrors.length > 0) console.log(`       Console Errors:`, consoleErrors);

    await context.close();
    return passed;
  } catch (err) {
    console.log(`[FAIL] ${name} - Exception: ${err.message}`);
    await context.close();
    return false;
  }
}

async function run() {
  const server = await startServer(4174);
  const baseUrl = 'http://localhost:4174';

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let allPassed = true;

  try {
    console.log('\n--- SUITE 1: Standard Cross-Browser & Device Views ---');
    allPassed &= await testScenario(browser, 'Desktop Chrome (Fresh Profile)', `${baseUrl}/`);
    allPassed &= await testScenario(browser, 'iPhone 14 Safari Emulation', `${baseUrl}/`, {
      contextOptions: devices['iPhone 14']
    });
    allPassed &= await testScenario(browser, 'Pixel 7 Android Emulation', `${baseUrl}/`, {
      contextOptions: devices['Pixel 7']
    });
    allPassed &= await testScenario(browser, 'iPad Pro 11 Tablet Emulation', `${baseUrl}/`, {
      contextOptions: devices['iPad Pro 11']
    });

    console.log('\n--- SUITE 2: Public Website Direct Routes & Navigation ---');
    allPassed &= await testScenario(browser, 'Product Detail Page (/products/shubh-labh-special)', `${baseUrl}/products/shubh-labh-special`);
    allPassed &= await testScenario(browser, 'Laboratory Page (/laboratory)', `${baseUrl}/laboratory`);
    allPassed &= await testScenario(browser, 'Laboratory Alias (/lab)', `${baseUrl}/lab`);
    allPassed &= await testScenario(browser, 'Login Portal (/login)', `${baseUrl}/login`);

    console.log('\n--- SUITE 3: Resilience to Missing Browser Features & Private Storage ---');
    // Test without Promise.withResolvers
    allPassed &= await testScenario(browser, 'Older Browser (Promise.withResolvers deleted)', `${baseUrl}/`, {
      initScript: () => {
        delete Promise.withResolvers;
        delete window.Promise.withResolvers;
      }
    });

    // Test with blocked localStorage / private browsing
    allPassed &= await testScenario(browser, 'Safari Private Mode (Storage Blocked)', `${baseUrl}/`, {
      initScript: () => {
        Object.defineProperty(window, 'localStorage', {
          get: () => { throw new DOMException('The operation is insecure.', 'SecurityError'); }
        });
        Object.defineProperty(window, 'sessionStorage', {
          get: () => { throw new DOMException('The operation is insecure.', 'SecurityError'); }
        });
      }
    });

    // Test CRM route redirects cleanly without blanking
    console.log('\n--- SUITE 4: CRM Protected Routes Safe Redirection ---');
    allPassed &= await testScenario(browser, 'Unauthenticated CRM route (/today)', `${baseUrl}/today`);

    console.log(`\n========================================`);
    console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED'}`);
    console.log(`========================================\n`);
  } finally {
    await browser.close();
    server.close();
  }
}

run();
