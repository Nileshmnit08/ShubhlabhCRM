const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runTestSuite() {
  console.log('====================================================');
  console.log('  SL-WEB-PREMIUM-UI-NAV-FIX-01 Verification Suite   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, details = '') {
    if (condition) {
      console.log(`✓ ${title}`);
      passed++;
    } else {
      console.error(`✗ ${title} - ${details}`);
      failed++;
    }
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const screenshotsDir = path.resolve(__dirname, '../../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // 1. Viewport Tests (Phase H Required Sizes)
  const viewports = [
    { name: 'Mobile 320', width: 320, height: 720, isMobile: true },
    { name: 'Mobile 375', width: 375, height: 812, isMobile: true },
    { name: 'Mobile 390', width: 390, height: 844, isMobile: true },
    { name: 'Mobile 430', width: 430, height: 932, isMobile: true },
    { name: 'Tablet 768', width: 768, height: 1024, isMobile: true },
    { name: 'Tablet 1024', width: 1024, height: 768, isMobile: false },
    { name: 'Desktop 1366', width: 1366, height: 768, isMobile: false },
    { name: 'Desktop 1920', width: 1920, height: 1080, isMobile: false }
  ];

  const PORT = process.env.TEST_PORT || '4175';
  const BASE_URL = `http://localhost:${PORT}/`;

  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(BASE_URL);
    await page.waitForTimeout(1500); // allow dynamic content and animations

    // Check brand presence
    const brandName = await page.locator('.brand-name').first().textContent();
    assert(`[${vp.name}] Brand name renders SHUBH LABH`, brandName.includes('SHUBH LABH'));

    const emblemHindi = await page.locator('.brand-emblem').first().textContent();
    assert(`[${vp.name}] Bilingual Hindi emblem renders`, emblemHindi.includes('शुभ') && emblemHindi.includes('लाभ'));

    // Check responsive navigation elements
    const desktopNavVisible = await page.locator('.desktop-nav').isVisible();
    const menuToggleVisible = await page.locator('.menu-toggle').isVisible();

    if (vp.isMobile) {
      assert(`[${vp.name}] Desktop nav is hidden on mobile/tablet`, !desktopNavVisible);
      assert(`[${vp.name}] Hamburger menu toggle is visible`, menuToggleVisible);

      // Verify toggle button aria-expanded initially false
      const expandedInitial = await page.locator('.menu-toggle').getAttribute('aria-expanded');
      assert(`[${vp.name}] Hamburger aria-expanded is initially "false"`, expandedInitial === 'false');

      // Click menu toggle to open drawer
      await page.click('.menu-toggle');
      await page.waitForTimeout(300);

      const expandedOpen = await page.locator('.menu-toggle').getAttribute('aria-expanded');
      assert(`[${vp.name}] Hamburger aria-expanded is "true" after click`, expandedOpen === 'true');

      const drawerOpen = await page.locator('.mobile-nav-drawer.open').isVisible();
      assert(`[${vp.name}] Mobile drawer is visible when open`, drawerOpen);

      // Count mobile drawer links
      const mobileLinks = await page.locator('.mobile-nav-links a').allTextContents();
      const cleanedMobile = mobileLinks.map(l => l.replace('→', '').trim());
      const uniqueMobile = new Set(cleanedMobile.map(l => l.toLowerCase()));
      assert(`[${vp.name}] No duplicate links in mobile drawer`, uniqueMobile.size === cleanedMobile.length, `Total: ${cleanedMobile.length}, Unique: ${uniqueMobile.size}`);
      assert(`[${vp.name}] Mobile drawer has all intended navigation links (>= 6)`, cleanedMobile.length >= 6, `Got: ${cleanedMobile.length}`);

      const expectedLinks = ['Home', 'Products', 'About', 'Knowledge', 'Become a Dealer', 'Contact'];
      for (const exp of expectedLinks) {
        assert(`[${vp.name}] Mobile has link "${exp}"`, cleanedMobile.some(m => m.toLowerCase().includes(exp.toLowerCase())));
      }

      // Check mobile drawer action buttons
      const ctaInDrawer = await page.locator('.mobile-drawer-actions .mobile-cta-btn').isVisible();
      assert(`[${vp.name}] Mobile drawer contains primary CTA button`, ctaInDrawer);

      const loginInDrawer = await page.locator('.mobile-drawer-actions .mobile-login-btn').isVisible();
      assert(`[${vp.name}] Mobile drawer contains login/portal button`, loginInDrawer);

      // Click a link to verify menu auto-closes
      await page.click('.mobile-nav-links a[href="#products"]');
      await page.waitForTimeout(300);
      const drawerClosed = await page.locator('.mobile-nav-drawer.open').isVisible();
      assert(`[${vp.name}] Mobile drawer automatically closes upon link click`, !drawerClosed);

    } else {
      assert(`[${vp.name}] Desktop nav is visible`, desktopNavVisible);
      assert(`[${vp.name}] Hamburger menu toggle is hidden on desktop`, !menuToggleVisible);

      // Verify no duplicates in desktop nav
      const desktopLinks = await page.locator('.desktop-nav .nav-link').allTextContents();
      const uniqueLinks = new Set(desktopLinks.map(l => l.trim().toLowerCase()));
      assert(`[${vp.name}] No duplicate links in desktop nav`, uniqueLinks.size === desktopLinks.length, `Total: ${desktopLinks.length}, Unique: ${uniqueLinks.size}`);
      assert(`[${vp.name}] Desktop nav has all intended navigation links (>= 6)`, desktopLinks.length >= 6, `Got: ${desktopLinks.length}`);

      // Verify primary CTA button & Login button
      const ctaBtn = await page.locator('.header-actions .cta-button').isVisible();
      assert(`[${vp.name}] Header has "Become a Dealer" CTA button`, ctaBtn);

      const portalBtn = await page.locator('.header-actions .portal-button').isVisible();
      assert(`[${vp.name}] Header has Login/Portal button`, portalBtn);
    }

    // Capture screenshot for visual validation
    const ssPath = path.join(screenshotsDir, `public-website-${vp.name.toLowerCase().replace(' ', '-')}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    console.log(`  Saved screenshot: ${ssPath}`);

    await page.close();
  }

  // 2. Section Anchors Verification
  console.log('\n--- 2. Section Anchors & IDs Verification ---');
  const testPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await testPage.goto(BASE_URL);
  await testPage.waitForTimeout(1000);

  const expectedAnchors = [
    { hash: '#home', selector: 'section#home' },
    { hash: '#products', selector: 'section#products' },
    { hash: '#about', selector: 'section#about' },
    { hash: '#knowledge', selector: 'section#knowledge' },
    { hash: '#dealer', selector: 'section#dealer' },
    { hash: '#contact', selector: 'section#contact' }
  ];

  for (const item of expectedAnchors) {
    const exists = await testPage.locator(item.selector).count();
    assert(`Anchor target ${item.selector} exists on page`, exists === 1);
  }

  // 3. Products Catalogue & WhatsApp Integration
  console.log('\n--- 3. Product Cards & Enquire Action Verification ---');
  const productCardsCount = await testPage.locator('.product-card').count();
  assert('Product catalog renders product cards', productCardsCount >= 3, `Count: ${productCardsCount}`);

  const whatsappBtns = await testPage.locator('.btn-enquire').count();
  assert('Every product card has an Enquire action', whatsappBtns === productCardsCount);

  const firstEnquireHref = await testPage.locator('.btn-enquire').first().getAttribute('href');
  assert('Enquire action links to WhatsApp API', firstEnquireHref && firstEnquireHref.includes('wa.me'));

  // 4. Horizontal Overflow Check
  console.log('\n--- 4. Horizontal Overflow Check across viewports ---');
  for (const vp of viewports) {
    await testPage.setViewportSize({ width: vp.width, height: vp.height });
    await testPage.waitForTimeout(300);

    const overflow = await testPage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert(`[${vp.name}] Zero horizontal scroll overflow`, !overflow);
  }

  // 5. Footer Navigation Integrity
  console.log('\n--- 5. Footer Navigation Integrity ---');
  const footerLinksCount = await testPage.locator('.footer-nav-list a').count();
  assert('Footer contains navigation links', footerLinksCount >= 10);

  const footerBottomLinks = await testPage.locator('.footer-bottom-links a').count();
  assert('Footer bottom has quick links', footerBottomLinks >= 4);

  await testPage.close();
  await browser.close();

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
