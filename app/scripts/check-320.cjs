const { chromium } = require('playwright');

async function check320() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
  await page.goto('http://localhost:4175/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const report = await page.evaluate(() => {
    const items = [];
    const elements = document.querySelectorAll('.sl-public-website *');
    elements.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > 320) {
        items.push({
          tag: el.tagName,
          class: el.className,
          w: Math.round(r.width),
          right: Math.round(r.right),
          text: (el.textContent || '').slice(0, 30).trim()
        });
      }
    });

    // Check padding of .container on 320px
    const container = document.querySelector('.container');
    const containerStyle = window.getComputedStyle(container);

    // Check dealer buttons
    const dealerBtns = Array.from(document.querySelectorAll('.dealer-actions-row .btn')).map(b => {
      const r = b.getBoundingClientRect();
      return { text: b.textContent.trim(), w: Math.round(r.width), right: Math.round(r.right) };
    });

    // Check hero buttons
    const heroBtns = Array.from(document.querySelectorAll('.hero-btn-row .btn')).map(b => {
      const r = b.getBoundingClientRect();
      return { text: b.textContent.trim(), w: Math.round(r.width), right: Math.round(r.right) };
    });

    // Check orbital art
    const orbit = document.querySelector('.dealer-orbital-art');
    const orbitRect = orbit ? orbit.getBoundingClientRect() : null;

    return {
      containerPadding: `${containerStyle.paddingLeft} ${containerStyle.paddingRight}`,
      dealerBtns,
      heroBtns,
      orbitRect: orbitRect ? { w: Math.round(orbitRect.width), right: Math.round(orbitRect.right) } : null,
      overflowItems: items
    };
  });

  console.log('320px Report:');
  console.log('Container padding:', report.containerPadding);
  console.log('Dealer buttons:', report.dealerBtns);
  console.log('Hero buttons:', report.heroBtns);
  console.log('Orbit art:', report.orbitRect);
  console.log('All overflowing items on 320px:');
  report.overflowItems.forEach(i => console.log(`  <${i.tag} class="${i.class}">: w=${i.w} right=${i.right} text="${i.text}"`));

  await browser.close();
}

check320().catch(console.error);
