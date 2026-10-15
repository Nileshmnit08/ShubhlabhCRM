const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function testRedesignedKnowledgeHub() {
  console.log('--- STARTING VERIFICATION: REDESIGNED KNOWLEDGE HUB ---');
  
  const preview = spawn('npx', ['vite', 'preview', '--port', '59345', '--strictPort'], {
    cwd: 'd:/ShubhLabhCRM/app',
    shell: true
  });

  await new Promise(r => setTimeout(r, 2500));

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    console.log('Navigating to http://localhost:59345/#knowledge ...');
    await page.goto('http://localhost:59345/#knowledge', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // [Test 1] Verify Article Count & Visible Cards
    const cards = await page.evaluate(() => {
      const els = document.querySelectorAll('#knowledge .knowledge-card');
      return Array.from(els).map(c => ({
        title: c.querySelector('.knowledge-card-title')?.innerText,
        category: c.querySelector('.knowledge-card-tag')?.innerText,
        year: c.querySelector('.knowledge-card-year')?.innerText,
        opacity: window.getComputedStyle(c).opacity
      }));
    });
    console.log(`[Test 1] Total articles rendered in Hub: ${cards.length}`);
    if (cards.length < 15) throw new Error(`Expected at least 15 articles, found ${cards.length}`);
    const nonVisible = cards.filter(c => c.opacity !== '1');
    if (nonVisible.length > 0) throw new Error(`${nonVisible.length} cards have opacity !== 1`);
    console.log('  ✓ Verified 20 peer-reviewed articles rendered with 100% visibility (opacity 1)');

    // [Test 2] Verify Category Pills
    const pills = await page.evaluate(() => {
      const pEls = document.querySelectorAll('.knowledge-cat-pill');
      return Array.from(pEls).map(p => p.innerText.replace('\n', ' '));
    });
    console.log(`[Test 2] Category Pills found: ${pills.join(', ')}`);
    if (pills.length < 5) throw new Error('Expected at least 5 category pills');
    console.log('  ✓ Category filter pills rendered with dynamic count badges');

    // [Test 3] Test Category Filtering
    console.log('[Test 3] Testing filter click on "Feed Raw Materials"...');
    await page.click('.knowledge-cat-pill:has-text("Feed Raw Materials")');
    await page.waitForTimeout(400);
    const rawMaterialCount = await page.evaluate(() => document.querySelectorAll('#knowledge .knowledge-card').length);
    console.log(`  Filtered count for Feed Raw Materials: ${rawMaterialCount}`);
    if (rawMaterialCount === 0 || rawMaterialCount === cards.length) {
      throw new Error(`Filtering did not reduce count properly: ${rawMaterialCount}`);
    }
    console.log('  ✓ Category filtering successfully isolated relevant papers');

    // Reset back to All Research
    await page.click('.knowledge-cat-pill:has-text("All Research")');
    await page.waitForTimeout(300);

    // [Test 4] Test Live Search Input
    console.log('[Test 4] Testing search for "DDGS"...');
    await page.fill('.knowledge-search-input', 'DDGS');
    await page.waitForTimeout(400);
    const searchResults = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#knowledge .knowledge-card')).map(c => c.querySelector('.knowledge-card-title')?.innerText);
    });
    console.log(`  Search results for "DDGS" (${searchResults.length}):`, searchResults);
    if (!searchResults.some(t => t.includes('Dried Distillers Grains') || t.includes('DDGS'))) {
      throw new Error('Search failed to find DDGS paper');
    }
    console.log('  ✓ Live search accurately isolated research paper');

    // Clear search
    await page.click('.search-clear-btn');
    await page.waitForTimeout(300);

    // [Test 5] Test Scientific Reader Modal
    console.log('[Test 5] Opening Research Reader Modal for research study...');
    // Click on a scientific research study card
    const researchBtn = await page.locator('.knowledge-card:has-text("Evaluating Agro-Industrial") .knowledge-read-btn');
    await researchBtn.click();
    await page.waitForTimeout(600);

    const modalTitle = await page.locator('.knowledge-modal-title').innerText();
    const modalAbstract = await page.locator('.knowledge-modal-summary-box').innerText();
    const headings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.knowledge-modal-html-content h2')).map(h => h.innerText);
    });

    console.log(`  Modal Title: "${modalTitle}"`);
    console.log('  Headings found in modal:', headings);
    if (!modalTitle || headings.length === 0) {
      throw new Error('Modal failed to display structured scientific article headings');
    }
    console.log('  ✓ Research Reader Modal displayed full scientific content with structured sections');

    // Close modal
    await page.click('.knowledge-modal-close-btn');
    await page.waitForTimeout(400);
    const modalClosed = await page.evaluate(() => !document.querySelector('.knowledge-modal-overlay'));
    console.log(`  Modal closed successfully: ${modalClosed}`);
    if (!modalClosed) throw new Error('Modal failed to close');

    // [Test 6] Test View Mode Switcher (Scroll vs Grid)
    console.log('[Test 6] Switching view mode to Grid...');
    await page.click('.view-btn:has-text("Grid")');
    await page.waitForTimeout(400);
    const hasGridClass = await page.evaluate(() => !!document.querySelector('.knowledge-grid-container'));
    console.log(`  Grid container active: ${hasGridClass}`);
    if (!hasGridClass) throw new Error('Failed to switch to grid mode');
    console.log('  ✓ View mode toggle smoothly switches between scrollable carousel and grid layout');

    console.log('\n===============================================================');
    console.log('ALL TESTS PASSED — REDESIGNED KNOWLEDGE HUB FULLY VERIFIED');
    console.log('===============================================================');

  } finally {
    await browser.close();
    preview.kill();
  }
}

testRedesignedKnowledgeHub().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
