const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function testKnowledgeVisibility() {
  const preview = spawn('npx', ['vite', 'preview', '--port', '59123', '--strictPort'], {
    cwd: 'd:/ShubhLabhCRM/app',
    shell: true
  });

  await new Promise(r => setTimeout(r, 2500));

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  try {
    const page = await browser.newPage();
    console.log('Navigating to http://localhost:59123/#knowledge ...');
    await page.goto('http://localhost:59123/#knowledge', { waitUntil: 'networkidle' });

    // Wait 2.5 seconds for async Supabase resolution and any layout transitions
    await page.waitForTimeout(2500);

    const cards = await page.evaluate(() => {
      const section = document.getElementById('knowledge');
      if (!section) return [];
      const cardEls = section.querySelectorAll('.knowledge-card');
      return Array.from(cardEls).map(c => ({
        classes: c.className,
        opacity: window.getComputedStyle(c).opacity,
        display: window.getComputedStyle(c).display,
        title: c.querySelector('.knowledge-card-title')?.innerText
      }));
    });

    console.log('Cards detected in #knowledge:', cards.length);
    cards.forEach((c, i) => {
      console.log('Card ' + (i + 1) + ': Title="' + c.title + '" | Opacity=' + c.opacity + ' | Classes="' + c.classes + '"');
      if (c.opacity !== '1') throw new Error('Card ' + (i + 1) + ' has opacity ' + c.opacity + ' (expected 1)!');
    });

    console.log('SUCCESS: All knowledge cards are 100% visible and correctly styled!');
  } finally {
    await browser.close();
    preview.kill();
  }
}

testKnowledgeVisibility().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
