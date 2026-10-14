const { chromium } = require('playwright');

async function testHeader() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const intermediateWidths = [992, 1000, 1024, 1080, 1140, 1200];

  for (const w of intermediateWidths) {
    const page = await browser.newPage({ viewport: { width: w, height: 768 } });
    await page.goto('http://localhost:4175/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const data = await page.evaluate(() => {
      const brand = document.querySelector('.brand').getBoundingClientRect();
      const nav = document.querySelector('.desktop-nav').getBoundingClientRect();
      const actions = document.querySelector('.header-actions').getBoundingClientRect();
      const headerContainer = document.querySelector('.header-container').getBoundingClientRect();

      // Check if nav wrapped or if items collide
      const navLinks = Array.from(document.querySelectorAll('.desktop-nav .nav-link')).map(el => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent.trim(), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
      });

      const uniqueTops = new Set(navLinks.map(l => l.top));
      const hasWrappedNav = uniqueTops.size > 1;

      const overlapBrandNav = brand.right > nav.left;
      const overlapNavActions = nav.right > actions.left;

      return {
        headerHeight: Math.round(headerContainer.height),
        brandRight: Math.round(brand.right),
        navLeft: Math.round(nav.left),
        navRight: Math.round(nav.right),
        actionsLeft: Math.round(actions.left),
        hasWrappedNav,
        overlapBrandNav,
        overlapNavActions,
        navLinks
      };
    });

    console.log(`Width ${w}px:`);
    console.log(`  Header Container Height: ${data.headerHeight}px`);
    console.log(`  Brand Right: ${data.brandRight}px | Nav: [${data.navLeft}px - ${data.navRight}px] | Actions Left: ${data.actionsLeft}px`);
    console.log(`  Overlap Brand-Nav: ${data.overlapBrandNav}, Overlap Nav-Actions: ${data.overlapNavActions}, Nav Wrapped: ${data.hasWrappedNav}`);
    if (data.overlapBrandNav || data.overlapNavActions || data.hasWrappedNav) {
      console.log(`  🚨 ISSUE AT ${w}px!`);
    }
    await page.close();
  }

  await browser.close();
}

testHeader().catch(console.error);
