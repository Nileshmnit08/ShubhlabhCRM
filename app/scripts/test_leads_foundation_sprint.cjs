const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

function getFreePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

async function runLeadsFoundationSprintVerification() {
  console.log('================================================================');
  console.log('STARTING SPRINT SL-WEB-LEADS-FOUNDATION-01 VERIFICATION SUITE');
  console.log('================================================================');

  const PORT = await getFreePort();
  const BASE_URL = `http://localhost:${PORT}`;
  console.log(`Allocated clean ephemeral port: ${PORT}`);

  // Start Vite Preview server
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: path.resolve(__dirname, '..'),
    shell: true,
    stdio: 'pipe'
  });

  await new Promise((resolve) => {
    preview.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes(String(PORT)) || msg.includes('http://localhost:')) {
        console.log(`✓ Vite preview server ready on ${BASE_URL}`);
        resolve();
      }
    });
    preview.stderr.on('data', (d) => {
      const errStr = d.toString();
      if (!errStr.includes('DeprecationWarning')) {
        console.error('Preview stderr:', errStr);
      }
    });
    setTimeout(resolve, 3500);
  });

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const results = [];

  try {
    const page = await browser.newPage();

    // -------------------------------------------------------------------------
    // TEST 1: Contact Form - Validation & Successful Submission
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Testing Contact Form Validation & Submission...');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/#contact`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const contactForm = page.locator('#contact-inquiry-form');
    const isContactFormPresent = await contactForm.isVisible();
    console.log(`  Contact form present: ${isContactFormPresent}`);

    // Trigger validation with invalid phone
    const nameInput = page.locator('#contact-name');
    const phoneInput = page.locator('#contact-phone');
    const submitBtn = contactForm.locator('button.lead-btn-submit');

    await nameInput.fill('A');
    await phoneInput.fill('12345');
    await submitBtn.click();
    await page.waitForTimeout(500);

    const phoneError = page.locator('.lead-field-error');
    const hasError = await phoneError.count() > 0;
    console.log(`  Validation error displayed on invalid phone: ${hasError}`);

    // Now fill with valid data
    await nameInput.fill('Ramesh Dairy Farm');
    await phoneInput.fill('9829012345');
    const subjectSelect = page.locator('#contact-subject');
    if (await subjectSelect.isVisible()) {
      await subjectSelect.selectOption({ index: 1 });
    }
    const messageInput = page.locator('#contact-message');
    await messageInput.fill('Requirement of 50 bags cattle feed for dairy in Jaipur.');

    await submitBtn.click();
    await page.waitForTimeout(1500);

    // Verify confirmation state
    const successCard = page.locator('.lead-success-card');
    const isSuccess = await successCard.isVisible();
    const successText = await page.locator('.lead-success-title').innerText().catch(() => '');
    console.log(`  Contact form submitted successfully: ${isSuccess} ("${successText}")`);

    results.push({
      test: 'Contact Form Validation & Submission',
      passed: isContactFormPresent && hasError && isSuccess
    });

    // -------------------------------------------------------------------------
    // TEST 2: Become a Dealer Form - Structure & 33 Rajasthan Districts
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Testing Become a Dealer Form & Territory Dropdown...');
    await page.goto(`${BASE_URL}/#dealer`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const dealerForm = page.locator('#dealer-application-form');
    const isDealerFormPresent = await dealerForm.isVisible();
    console.log(`  Dealer form present: ${isDealerFormPresent}`);

    // Check district options count (Rajasthan has 33 standard districts)
    const districtSelect = page.locator('#dealer-district');
    const districtOptions = await districtSelect.locator('option').allInnerTexts();
    console.log(`  Districts loaded: ${districtOptions.length} (Sample: ${districtOptions.slice(0, 5).join(', ')})`);
    const hasExpectedDistricts = districtOptions.length >= 30;

    // Fill Dealer Form
    await page.locator('#dealer-applicant-name').fill('Vikram Singh');
    await page.locator('#dealer-firm-name').fill('Singh Agro & Cattle Feed Agency');
    await page.locator('#dealer-phone').fill('9829055443');
    await districtSelect.selectOption('Jaipur');
    await page.locator('#dealer-city').fill('Chomu');
    await page.locator('#dealer-pincode').fill('303702');
    await page.locator('#dealer-proposed-area').fill('Serving 15 dairy villages around Chomu mandi');

    const dealerSubmitBtn = dealerForm.locator('button.lead-btn-submit');
    await dealerSubmitBtn.click();
    await page.waitForTimeout(1500);

    const dealerSuccessCard = page.locator('#dealer-form-box .lead-success-card');
    const isDealerSuccess = await dealerSuccessCard.isVisible();
    console.log(`  Dealer form submitted successfully: ${isDealerSuccess}`);

    results.push({
      test: 'Become a Dealer Form & Territory Selection',
      passed: isDealerFormPresent && hasExpectedDistricts && isDealerSuccess
    });

    // -------------------------------------------------------------------------
    // TEST 3: Product Detail Page & Quick Enquiry Modal
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Testing Product Quick Enquiry Modal on Detail Page...');
    await page.goto(`${BASE_URL}/products/pallet-8000`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const enquiryTriggerBtn = page.locator('#open-product-enquiry-modal-btn');
    const isTriggerBtnPresent = await enquiryTriggerBtn.isVisible();
    console.log(`  Enquire Formulation button present: ${isTriggerBtnPresent}`);

    await enquiryTriggerBtn.click();
    await page.waitForTimeout(500);

    const modalOverlay = page.locator('.lead-modal-overlay');
    const isModalVisible = await modalOverlay.isVisible();
    console.log(`  Quick Enquiry modal overlay visible: ${isModalVisible}`);

    // Fill modal form
    await page.locator('#prod-enq-name').fill('Suresh Patel');
    await page.locator('#prod-enq-phone').fill('9829099887');
    await page.locator('#prod-enq-district').fill('Kota');
    await modalOverlay.locator('button.lead-btn-submit').click();
    await page.waitForTimeout(1500);

    const modalSuccess = modalOverlay.locator('.lead-success-card');
    const isModalSubmitted = await modalSuccess.isVisible();
    console.log(`  Modal inquiry submitted successfully: ${isModalSubmitted}`);

    // Close modal
    const closeBtn = page.locator('.lead-modal-close-btn');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
    await page.waitForTimeout(300);

    results.push({
      test: 'Product Detail Quick Enquiry Modal',
      passed: isTriggerBtnPresent && isModalVisible && isModalSubmitted
    });

    // -------------------------------------------------------------------------
    // TEST 4: Anti-Bot Honeypot Trapping
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Testing Honeypot Trap Field Protection...');
    // Verify honeypot field is rendered with aria-hidden or visually hidden
    await page.goto(`${BASE_URL}/#contact`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const honeypotInput = page.locator('input[name="website_hp"]').first();
    const isHpRendered = await honeypotInput.count() > 0;
    // Check if parent container has display: none or opacity 0
    const hpBox = page.locator('.hp-trap-field').first();
    const hpDisplay = await hpBox.evaluate(el => window.getComputedStyle(el).display);
    console.log(`  Honeypot field rendered: ${isHpRendered}, computed display: "${hpDisplay}"`);

    results.push({
      test: 'Anti-Bot Honeypot Trap Protection',
      passed: isHpRendered && hpDisplay === 'none'
    });

    // -------------------------------------------------------------------------
    // TEST 5: Mobile Viewport 375px Clean Responsiveness (Zero Overflow)
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Testing Mobile 375px Responsiveness & No Horizontal Scroll...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/#contact`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const overflowCheck = await page.evaluate(() => {
      const docEl = document.documentElement;
      const body = document.body;
      const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
      const clientW = window.innerWidth;
      return { scrollW, clientW, hasOverflow: scrollW > clientW + 1 };
    });

    console.log(`  Viewport Width: 375px | Document ScrollWidth: ${overflowCheck.scrollW}px | Overflow: ${overflowCheck.hasOverflow}`);

    results.push({
      test: 'Mobile 375px Viewport Zero Horizontal Overflow',
      passed: !overflowCheck.hasOverflow
    });

  } catch (err) {
    console.error('Test execution error:', err);
    results.push({ test: 'Execution Error', passed: false, error: err.message });
  } finally {
    await browser.close();
    preview.kill();
  }

  console.log('\n================================================================');
  console.log('SPRINT SL-WEB-LEADS-FOUNDATION-01 VERIFICATION SUMMARY');
  console.log('================================================================');
  let allPassed = true;
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.test}`);
    if (!r.passed) allPassed = false;
  }
  console.log('================================================================');

  if (allPassed) {
    console.log('🎉 ALL SPRINT VERIFICATION TESTS PASSED (100%)');
    process.exit(0);
  } else {
    console.error('❌ SOME VERIFICATION TESTS FAILED');
    process.exit(1);
  }
}

runLeadsFoundationSprintVerification();
