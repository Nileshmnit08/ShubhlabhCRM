const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

async function runTests() {
  console.log('====================================================');
  console.log('  SL-WEB-CRM-UNIFY-02 Verification Test Suite       ');
  console.log('====================================================\n');

  // 1. Start Vite preview server on port 4173
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
    cwd: path.resolve(__dirname, '..'),
    shell: true,
    stdio: 'pipe'
  });

  let serverStarted = false;
  previewProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('http://localhost:4173')) {
      serverStarted = true;
    }
  });

  // Wait up to 10 seconds for server
  for (let i = 0; i < 20; i++) {
    if (serverStarted) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const browser = await chromium.launch({ 
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // TEST 1: Public Website at /
    console.log('\n--- 1. Testing Root URL (/) ---');
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });

    const title = await page.title();
    assert(title.includes('Shubh Labh'), `Page title contains 'Shubh Labh' (Actual: "${title}")`);

    const hasBrandMark = await page.locator('.brand-mark').count();
    assert(hasBrandMark > 0, 'Hindi brand mark (शुभ लाभ) is rendered');

    const heroHeading = await page.locator('.hero h1').innerText();
    assert(heroHeading.includes('Better nutrition'), `Hero heading contains "Better nutrition" (Actual: "${heroHeading.replace(/\n/g, ' ')}")`);

    const productCards = await page.locator('.product-card').count();
    assert(productCards === 3, `Products section contains 3 product cards (Found: ${productCards})`);

    const loginLink = page.locator('header .login-link');
    const loginLinkVisible = await loginLink.isVisible();
    assert(loginLinkVisible, 'Login button is clearly visible in the header');

    const headerLoginButtons = await page.locator('header a:has-text("Login")').count();
    assert(headerLoginButtons === 1, `Exactly ONE Login button rendered in desktop header (Found: ${headerLoginButtons})`);

    const loginHref = await loginLink.getAttribute('href');
    assert(loginHref === '/login', `Header Login button links to /login (Actual: "${loginHref}")`);

    // TEST 1B: Mobile Viewport & Menu Test
    console.log('\n--- 1B. Testing Mobile Viewport (375x667) ---');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(200);

    const mobileHeaderLogin = await page.locator('header .login-link').isVisible();
    assert(mobileHeaderLogin, 'Single header Login button remains visible on mobile');

    const menuToggle = page.locator('.menu-toggle');
    assert(await menuToggle.isVisible(), 'Hamburger menu toggle is visible on mobile');

    // Open mobile menu
    await menuToggle.click();
    await page.waitForTimeout(300);

    const navLoginCount = await page.locator('.main-nav a:has-text("Login")').count();
    assert(navLoginCount === 0, 'No duplicate login button inside opened mobile navigation drawer');

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);

    // TEST 2: Workspace Selector at /login
    console.log('\n--- 2. Testing Destination Selector (/login) ---');
    await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle' });

    const selectorHeading = await page.locator('h2').innerText();
    assert(selectorHeading.includes('Welcome to Shubh Labh'), `Heading is "Welcome to Shubh Labh" (Actual: "${selectorHeading}")`);

    const selectorSubtitle = await page.locator('p').first().innerText();
    assert(selectorSubtitle.includes('Select the workspace you want to access'), `Subtitle matches specification (Actual: "${selectorSubtitle}")`);

    const radioCount = await page.locator('input[type="radio"]').count();
    assert(radioCount === 2, `Two mutually exclusive radio options rendered (Found: ${radioCount})`);

    const crmChecked = await page.locator('input[value="crm"]').isChecked();
    assert(crmChecked, 'CRM is selected by default');

    const crmLabel = await page.locator('text=CRM — Business Management').count();
    assert(crmLabel > 0, 'Radio Option 1 label "CRM — Business Management" rendered');

    const websiteLabel = await page.locator('text=Website Admin Panel').count();
    assert(websiteLabel > 0, 'Radio Option 2 label "Website Admin Panel" rendered');

    const continueBtn = await page.locator('button[type="submit"]').count();
    assert(continueBtn > 0, 'Continue button rendered');

    const backToWeb = await page.locator('text=Back to Website').count();
    assert(backToWeb > 0, '"Back to Website" link rendered');

    // TEST 3: Selector Continue to CRM
    console.log('\n--- 3. Testing Selector Flow to CRM (/login?destination=crm) ---');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);

    const crmAuthHeading = await page.locator('h2').innerText();
    assert(crmAuthHeading.includes('Secure CRM Login'), `Opens real CRM authentication: "Secure CRM Login" (Actual: "${crmAuthHeading}")`);

    const emailInput = await page.locator('input[type="email"]').count();
    const passInput = await page.locator('input[type="password"]').count();
    assert(emailInput > 0 && passInput > 0, 'Real email and password fields rendered');

    const backToSelector = await page.locator('text=Back to Workspace Selector').count();
    assert(backToSelector > 0, '"Back to Workspace Selector" button rendered');

    // TEST 4: Website Admin Panel selection
    console.log('\n--- 4. Testing Website Admin Panel selection ---');
    await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle' });
    await page.click('input[value="website"]');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);

    const pendingNotice = await page.locator('text=Website Admin Panel (CMS) Notice').count();
    assert(pendingNotice > 0, 'Displays informative pending provisioning notice for unhosted CMS');

    // TEST 5: Deep Link & Protected CRM Route redirection
    console.log('\n--- 5. Testing Protected CRM Routes (Unauthenticated) ---');
    await page.goto('http://localhost:4173/customers', { waitUntil: 'networkidle' });
    const currentUrl = page.url();
    assert(currentUrl.includes('/login?destination=crm'), `Accessing /customers redirects to /login?destination=crm (Actual: "${currentUrl}")`);

    const authFormPresent = await page.locator('text=Secure CRM Login').count();
    assert(authFormPresent > 0, 'CRM Login is displayed to protect sensitive customer data');

    // TEST 6: Unknown routes (404 Page)
    console.log('\n--- 6. Testing Unknown URL (404) ---');
    await page.goto('http://localhost:4173/non-existent-route-xyz', { waitUntil: 'networkidle' });
    const notFoundHeader = await page.locator('h2').innerText();
    assert(notFoundHeader.includes('Page Not Found'), `Displays 404 "Page Not Found" (Actual: "${notFoundHeader}")`);

    const returnWebBtn = await page.locator('text=Return to Public Website').count();
    const returnCrmBtn = await page.locator('text=Go to CRM Dashboard').count();
    assert(returnWebBtn > 0 && returnCrmBtn > 0, 'Provides return buttons for both Website and CRM');

  } catch (err) {
    console.error('[TEST ERROR]', err);
    failed++;
  } finally {
    await browser.close();
    previewProcess.kill();
    // Force kill if needed
    try {
      process.kill(-previewProcess.pid);
    } catch (e) {}
  }

  console.log('\n====================================================');
  console.log(`  Test Results: ${passed} PASSED, ${failed} FAILED `);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
