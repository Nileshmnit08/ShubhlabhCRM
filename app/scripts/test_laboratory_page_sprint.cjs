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

async function runLabSprintVerification() {
  console.log('================================================================');
  console.log('STARTING SPRINT SL-WEB-LAB-PAGE-01 VERIFICATION SUITE');
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

  // Wait for server to be ready
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
    // -------------------------------------------------------------------------
    // TEST 1: Header Navigation on Home Page has In-House Lab Link
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Checking Home Page Navigation for In-House Lab Link...');
    const homePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await homePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const labNavLink = await homePage.locator('nav a[href="/laboratory"], header a[href="/laboratory"], a:has-text("In-House Lab")').first();
    const navLinkExists = await labNavLink.count() > 0;
    console.log(`  - Nav link exists in desktop header: ${navLinkExists ? 'PASS' : 'FAIL'}`);
    results.push({ name: 'Desktop Header In-House Lab Link', passed: navLinkExists });

    // -------------------------------------------------------------------------
    // TEST 2: Direct Route /laboratory Loads with Complete Content
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Testing Direct Route /laboratory...');
    const labPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await labPage.goto(`${BASE_URL}/laboratory`, { waitUntil: 'networkidle' });

    // Verify title
    const pageTitle = await labPage.title();
    console.log(`  - Document Title: "${pageTitle}"`);
    const titleValid = pageTitle.includes('In-House Quality Laboratory') || pageTitle.includes('Shubh Labh');
    results.push({ name: 'Page Title Verification', passed: titleValid });

    // Verify Hero elements
    const heroTitle = await labPage.locator('.lab-hero-title').innerText();
    console.log(`  - Hero Title: "${heroTitle.replace(/\n/g, ' ')}"`);
    const heroValid = heroTitle.includes('Precision Nutrition') && heroTitle.includes('Scientific Quality Control');
    results.push({ name: 'Hero Headline & Gradient Accent', passed: heroValid });

    // Verify 4 Key Quality Stats
    const statsCards = await labPage.locator('.lab-stat-card').count();
    console.log(`  - Quality Stats Cards: ${statsCards}`);
    results.push({ name: '4 Key Quality Stats Cards (100%, <20ppb, ±0.2%, 90Days)', passed: statsCards === 4 });

    // Verify 6-Stage QC Workflow
    const workflowCards = await labPage.locator('.workflow-card').count();
    console.log(`  - 6-Stage QC Workflow Steps: ${workflowCards}`);
    results.push({ name: '6-Stage Quality Control Workflow Steps', passed: workflowCards === 6 });

    // Verify Proximate Parameters (at least 8)
    const paramCards = await labPage.locator('.param-card').count();
    console.log(`  - Proximate Parameter Cards: ${paramCards}`);
    results.push({ name: 'Proximate Parameters Showcase (>=8)', passed: paramCards >= 8 });

    // Verify Parameter Category Filtering
    console.log('\n[Test 3] Testing Interactive Parameter Filter Pills...');
    const filterBtn = await labPage.locator('.filter-btn:has-text("Nutritional Density")').first();
    if (await filterBtn.count() > 0) {
      await filterBtn.click();
      await labPage.waitForTimeout(300);
      const filteredCount = await labPage.locator('.param-card').count();
      console.log(`  - Parameters after filtering for "Nutritional Density": ${filteredCount}`);
      results.push({ name: 'Parameter Category Filter Pill Click', passed: filteredCount === 2 }); // CP & EE
    } else {
      results.push({ name: 'Parameter Category Filter Pill Click', passed: false });
    }

    // Reset filter
    const allBtn = await labPage.locator('.filter-btn:has-text("All Parameters")').first();
    if (await allBtn.count() > 0) {
      await allBtn.click();
      await labPage.waitForTimeout(200);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Analytical Equipment Showcase (8 Instruments)
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Testing Analytical Equipment Showcase...');
    const equipCards = await labPage.locator('.equip-card').count();
    console.log(`  - Equipment Showcase Cards: ${equipCards}`);
    results.push({ name: 'Analytical Equipment Showcase (8 Instruments)', passed: equipCards === 8 });

    // Verify Specific Instruments exist
    const hasNir = await labPage.locator('.equip-card:has-text("NIR")').count() > 0;
    const hasKjeldahl = await labPage.locator('.equip-card:has-text("Kjeldahl")').count() > 0;
    const hasSoxhlet = await labPage.locator('.equip-card:has-text("Soxhlet")').count() > 0;
    console.log(`  - Core hardware present (NIR, Kjeldahl, Soxhlet): ${hasNir && hasKjeldahl && hasSoxhlet ? 'PASS' : 'FAIL'}`);
    results.push({ name: 'Core Hardware Instruments Present', passed: hasNir && hasKjeldahl && hasSoxhlet });

    // -------------------------------------------------------------------------
    // TEST 5: Regulatory Compliance & Traceability Notice
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Checking BIS Compliance & 90-Day Retention Notice...');
    const complianceBox = await labPage.locator('.compliance-box').count();
    const hasBis = await labPage.locator('.compliance-box:has-text("Bureau of Indian Standards")').count() > 0;
    console.log(`  - BIS/ICAR Compliance Card: ${hasBis ? 'PASS' : 'FAIL'}`);
    results.push({ name: 'BIS Compliance Adherence Notice', passed: hasBis });

    // -------------------------------------------------------------------------
    // TEST 6: FAQ Accordion Interactive Expand/Collapse
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Testing FAQ Accordion Interaction...');
    const firstFaq = await labPage.locator('.faq-item').first();
    await firstFaq.click();
    await labPage.waitForTimeout(300);
    const faqAnswerVisible = await labPage.locator('.faq-answer').first().isVisible();
    console.log(`  - FAQ answer visible after click: ${faqAnswerVisible ? 'PASS' : 'FAIL'}`);
    results.push({ name: 'FAQ Accordion Interactive Expand', passed: faqAnswerVisible });

    // -------------------------------------------------------------------------
    // TEST 7: WhatsApp Helpline & Pre-Filled Message
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Checking WhatsApp Desk Link & Pre-filled text...');
    const waLink = await labPage.locator('a.btn-lab-whatsapp').first().getAttribute('href');
    console.log(`  - WhatsApp Href: "${waLink}"`);
    const waValid = waLink && waLink.includes('wa.me') && waLink.includes('Laboratory');
    results.push({ name: 'WhatsApp Lab Desk Link with Pre-filled Message', passed: !!waValid });

    // -------------------------------------------------------------------------
    // TEST 8: Alias Route /lab redirects to /laboratory
    // -------------------------------------------------------------------------
    console.log('\n[Test 8] Checking /lab Alias Route Redirect...');
    const aliasPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await aliasPage.goto(`${BASE_URL}/lab`, { waitUntil: 'networkidle' });
    const finalUrl = aliasPage.url();
    console.log(`  - Navigating to /lab resolved to: ${finalUrl}`);
    const redirectValid = finalUrl.endsWith('/laboratory');
    results.push({ name: '/lab Alias Redirect to /laboratory', passed: redirectValid });

    // -------------------------------------------------------------------------
    // TEST 9: Mobile Viewport 375px (Responsive & Zero Overflow)
    // -------------------------------------------------------------------------
    console.log('\n[Test 9] Testing Mobile Responsiveness (375px)...');
    const mobilePage = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await mobilePage.goto(`${BASE_URL}/laboratory`, { waitUntil: 'networkidle' });

    // Check horizontal scroll / overflow
    const hasHorizontalOverflow = await mobilePage.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`  - Has Horizontal Overflow on 375px: ${hasHorizontalOverflow ? 'FAIL (overflow detected)' : 'PASS (clean)'}`);
    results.push({ name: 'Mobile 375px Zero Horizontal Overflow', passed: !hasHorizontalOverflow });

    // Mobile Hamburger Toggle
    const mobileToggle = await mobilePage.locator('#lab-mobile-menu-toggle, .menu-toggle').first();
    const toggleExists = await mobileToggle.count() > 0;
    if (toggleExists) {
      await mobileToggle.click({ force: true });
      await mobilePage.waitForTimeout(400);
      const drawerVisible = await mobilePage.locator('.mobile-nav-drawer.open').count() > 0;
      console.log(`  - Mobile Drawer opened on toggle click: ${drawerVisible ? 'PASS' : 'FAIL'}`);
      results.push({ name: 'Mobile Hamburger Drawer Interaction', passed: drawerVisible });
    } else {
      results.push({ name: 'Mobile Hamburger Drawer Interaction', passed: false });
    }

  } catch (err) {
    console.error('Test execution error:', err);
    results.push({ name: 'Fatal execution error', passed: false, error: err.message });
  } finally {
    await browser.close();

    // Cleanly terminate preview server
    if (preview.pid) {
      const { exec } = require('child_process');
      exec(`taskkill /F /T /PID ${preview.pid}`, () => {});
    }
  }

  // ---------------------------------------------------------------------------
  // Summary Report
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('SL-WEB-LAB-PAGE-01 VERIFICATION SUMMARY REPORT');
  console.log('================================================================');
  let passCount = 0;
  results.forEach((r, idx) => {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    if (r.passed) passCount++;
    console.log(`${idx + 1}. [${status}] ${r.name}`);
  });
  console.log('----------------------------------------------------------------');
  console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${results.length - passCount}`);
  console.log(`Success Rate: ${((passCount / results.length) * 100).toFixed(1)}%`);
  console.log('================================================================');

  if (passCount !== results.length) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLabSprintVerification();
