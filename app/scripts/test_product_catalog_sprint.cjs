const { chromium } = require('playwright');
const { spawn, execSync } = require('child_process');
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

async function runSprintVerification() {
  console.log('--- STARTING SPRINT SL-WEB-PRODUCT-CATALOG-01 VERIFICATION ---');

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
    // TEST 1: Desktop Home & Mega-Menu
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Testing Desktop Navigation & Mega-Menu...');
    const desktopPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await desktopPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    // Look for nav trigger
    const navTrigger = await desktopPage.$('#products-nav-trigger');
    if (navTrigger) {
      console.log('  ✓ #products-nav-trigger found in desktop navbar');
      // Hover or click to open mega menu
      await navTrigger.hover();
      await desktopPage.waitForTimeout(400);
      
      let megaMenu = await desktopPage.$('#products-mega-menu');
      if (!megaMenu) {
        await navTrigger.click();
        await desktopPage.waitForTimeout(400);
        megaMenu = await desktopPage.$('#products-mega-menu');
      }

      if (megaMenu) {
        console.log('  ✓ #products-mega-menu opened successfully');
        const categoriesCount = await desktopPage.$$eval('.mega-category-item', els => els.length);
        console.log(`  ✓ Found ${categoriesCount} categories in Mega-Menu`);
        
        // Check spotlight card
        const spotlightTitle = await desktopPage.$eval('.mega-spotlight-title', el => el.textContent.trim()).catch(() => null);
        console.log(`  ✓ Mega-menu spotlight: "${spotlightTitle}"`);
        
        results.push({ 
          test: 'Desktop Mega-Menu Hover & Render', 
          status: categoriesCount >= 4 ? 'PASS' : 'FAIL', 
          details: `${categoriesCount} categories, spotlight: ${spotlightTitle}` 
        });
      } else {
        results.push({ test: 'Desktop Mega-Menu Render', status: 'FAIL', details: 'Menu did not open on hover/click' });
      }
    } else {
      results.push({ test: 'Desktop Mega-Menu Trigger', status: 'FAIL', details: '#products-nav-trigger not found' });
    }

    // -------------------------------------------------------------------------
    // TEST 2: Product Catalog Section & Live Search
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Testing Product Catalog Section & Filter Controls...');
    await desktopPage.evaluate(() => {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView();
    });
    await desktopPage.waitForTimeout(500);

    const catPills = await desktopPage.$$eval('.cat-pill', els => els.map(e => e.textContent.trim()));
    console.log(`  ✓ Found ${catPills.length} category filter pills: ${catPills.join(', ')}`);

    // Click on Cattle Feed pill to test subcategory pills display
    const catButtons = await desktopPage.$$('.cat-pill');
    if (catButtons.length > 1) {
      await catButtons[1].click();
      await desktopPage.waitForTimeout(400);
    }

    const subcatPills = await desktopPage.$$eval('.subcat-pill', els => els.map(e => e.textContent.trim()));
    console.log(`  ✓ Found ${subcatPills.length} subcategory filter pills: ${subcatPills.join(', ')}`);

    // Reset to "All Formulations" so all products are available for live search
    if (catButtons.length > 0) {
      await catButtons[0].click();
      await desktopPage.waitForTimeout(400);
    }

    // Live search testing
    const searchInput = await desktopPage.$('#catalog-live-search');
    if (searchInput) {
      await searchInput.fill('8000');
      await desktopPage.waitForTimeout(500);
      const feedTitles = await desktopPage.$$eval('.product-card-title', els => els.map(e => e.textContent.trim()));
      console.log(`  ✓ Search for "8000" yielded: ${feedTitles.join(', ')}`);
      const matched = feedTitles.some(t => t.includes('8000'));
      results.push({ 
        test: 'Catalog Live Search', 
        status: matched ? 'PASS' : 'FAIL', 
        details: `Found: ${feedTitles.join(', ')}` 
      });
      
      // Clear search
      await searchInput.fill('');
      await desktopPage.waitForTimeout(400);
    } else {
      results.push({ test: 'Catalog Live Search', status: 'FAIL', details: '#catalog-live-search not found' });
    }

    // -------------------------------------------------------------------------
    // TEST 3: Product Detail Page (/products/pallet-8000)
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Testing Product Detail Route (/products/pallet-8000)...');
    await desktopPage.goto(`${BASE_URL}/products/pallet-8000`, { waitUntil: 'networkidle' });

    const detailTitle = await desktopPage.$eval('.product-detail-title', el => el.textContent.trim()).catch(() => null);
    console.log(`  ✓ Product Detail Title: "${detailTitle}"`);

    const breadcrumbs = await desktopPage.$eval('.detail-breadcrumbs', el => el.textContent.trim()).catch(() => null);
    console.log(`  ✓ Breadcrumbs: "${breadcrumbs}"`);

    const specsCount = await desktopPage.$$eval('.specs-table tbody tr', els => els.length).catch(() => 0);
    console.log(`  ✓ Specification Rows: ${specsCount}`);

    const feedingGuide = await desktopPage.$eval('.feeding-guide-box', el => el.textContent.trim()).catch(() => null);
    console.log(`  ✓ Feeding Guide Present: ${Boolean(feedingGuide)}`);

    const whatsappBtn = await desktopPage.$('.whatsapp-enquiry-btn');
    let waHref = '';
    if (whatsappBtn) {
      waHref = await whatsappBtn.getAttribute('href');
      console.log(`  ✓ WhatsApp Enquiry Button URL: ${waHref.substring(0, 60)}...`);
    }

    const test3Pass = Boolean(detailTitle && specsCount > 0 && waHref && waHref.includes('wa.me') && feedingGuide);
    results.push({
      test: 'Product Detail Page (/products/pallet-8000)',
      status: test3Pass ? 'PASS' : 'FAIL',
      details: `Title: ${detailTitle}, Specs: ${specsCount} rows, Feeding Guide: ${Boolean(feedingGuide)}, WhatsApp: ${Boolean(waHref)}`
    });

    // -------------------------------------------------------------------------
    // TEST 4: Mobile Viewport & Catalogue Accordion
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Testing Mobile Viewport (375x667) & Catalogue Accordion...');
    const mobilePage = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await mobilePage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    // Open mobile menu drawer
    const menuToggle = await mobilePage.$('#mobile-menu-toggle');
    if (menuToggle) {
      await menuToggle.click();
      await mobilePage.waitForTimeout(500);

      const accordionBtn = await mobilePage.$('#mobile-products-accordion-btn');
      if (accordionBtn) {
        console.log('  ✓ #mobile-products-accordion-btn found in mobile menu drawer');
        await accordionBtn.click();
        await mobilePage.waitForTimeout(400);

        const subItems = await mobilePage.$$eval('.mobile-sub-link', els => els.length);
        console.log(`  ✓ Mobile products accordion opened with ${subItems} categories/links`);

        results.push({
          test: 'Mobile Drawer & Products Accordion',
          status: subItems >= 4 ? 'PASS' : 'FAIL',
          details: `${subItems} categories rendered inside mobile accordion`
        });
      } else {
        results.push({ test: 'Mobile Accordion Button', status: 'FAIL', details: '#mobile-products-accordion-btn not found' });
      }
    } else {
      results.push({ test: 'Mobile Menu Toggle', status: 'FAIL', details: '#mobile-menu-toggle not found' });
    }

    await mobilePage.close();
    await desktopPage.close();

  } catch (err) {
    console.error('Test execution error:', err);
    results.push({ test: 'Test Suite Execution', status: 'ERROR', details: err.message });
  } finally {
    await browser.close();
    if (preview.pid) {
      try {
        execSync(`taskkill /F /T /PID ${preview.pid}`);
      } catch (e) {}
    }
  }

  console.log('\n===============================================================');
  console.log('           SPRINT VERIFICATION TEST REPORT                      ');
  console.log('===============================================================');
  let allPass = true;
  results.forEach(r => {
    const symbol = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${symbol} [${r.status}] ${r.test} ${r.details ? `— ${r.details}` : ''}`);
    if (r.status !== 'PASS') allPass = false;
  });
  console.log('===============================================================');
  console.log(`OVERALL RESULT: ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('===============================================================');

  process.exit(allPass ? 0 : 1);
}

runSprintVerification();
