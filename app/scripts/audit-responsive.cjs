const { chromium } = require('playwright');

const viewports = [
  // Mobile phones
  { name: 'Mobile 320', width: 320, height: 720 },
  { name: 'Mobile 360', width: 360, height: 740 },
  { name: 'Mobile 375', width: 375, height: 812 },
  { name: 'Mobile 390', width: 390, height: 844 },
  { name: 'Mobile 430', width: 430, height: 932 },
  // Tablets
  { name: 'Tablet 600', width: 600, height: 960 },
  { name: 'Tablet 768', width: 768, height: 1024 },
  { name: 'Tablet 820', width: 820, height: 1180 },
  { name: 'Tablet 1024', width: 1024, height: 768 },
  // Laptops and desktops
  { name: 'Desktop 1280', width: 1280, height: 800 },
  { name: 'Desktop 1366', width: 1366, height: 768 },
  { name: 'Desktop 1440', width: 1440, height: 900 },
  { name: 'Desktop 1920', width: 1920, height: 1080 }
];

async function audit() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  console.log('================================================================');
  console.log('       SHUBH LABH RESPONSIVE VIEWPORT COMPREHENSIVE AUDIT       ');
  console.log('================================================================\n');

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto('http://localhost:4175/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const auditData = await page.evaluate((vpWidth) => {
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      const hasHorizontalScroll = scrollWidth > innerWidth;

      // Find any elements sticking out beyond the viewport
      const overflowingElements = [];
      const allElements = document.querySelectorAll('.sl-public-website *');
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.right > innerWidth + 1.5 && rect.width > 0 && rect.height > 0) {
          // Check if it has overflow hidden parent
          const tag = el.tagName.toLowerCase();
          const className = (el.className && typeof el.className === 'string') ? el.className.trim() : '';
          overflowingElements.push({
            tag,
            className: className.slice(0, 50),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            excess: Math.round(rect.right - innerWidth)
          });
        }
      }

      // Check header items
      const header = document.querySelector('.site-header');
      const headerRect = header ? header.getBoundingClientRect() : null;
      const brand = document.querySelector('.brand');
      const brandRect = brand ? brand.getBoundingClientRect() : null;
      const desktopNav = document.querySelector('.desktop-nav');
      const desktopNavVisible = desktopNav && window.getComputedStyle(desktopNav).display !== 'none';
      const desktopNavRect = desktopNavVisible ? desktopNav.getBoundingClientRect() : null;
      const headerActions = document.querySelector('.header-actions');
      const actionsRect = headerActions ? headerActions.getBoundingClientRect() : null;
      const menuToggle = document.querySelector('.menu-toggle');
      const menuToggleVisible = menuToggle && window.getComputedStyle(menuToggle).display !== 'none';

      // Check collision in header
      let headerCollision = false;
      let collisionDetails = '';
      if (desktopNavVisible && brandRect && actionsRect && desktopNavRect) {
        if (brandRect.right > desktopNavRect.left || desktopNavRect.right > actionsRect.left) {
          headerCollision = true;
          collisionDetails = `Brand R:${Math.round(brandRect.right)} vs Nav L:${Math.round(desktopNavRect.left)} | Nav R:${Math.round(desktopNavRect.right)} vs Actions L:${Math.round(actionsRect.left)}`;
        }
      }

      // Check touch target sizes on interactive elements (if mobile/tablet <= 991px)
      const smallTouchTargets = [];
      if (vpWidth <= 991) {
        const interactives = document.querySelectorAll('button, a, input, select, textarea');
        for (const item of interactives) {
          if (window.getComputedStyle(item).display === 'none' || window.getComputedStyle(item).visibility === 'hidden') continue;
          const r = item.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32)) {
            smallTouchTargets.push({
              text: (item.textContent || '').slice(0, 20).trim(),
              w: Math.round(r.width),
              h: Math.round(r.height),
              tag: item.tagName.toLowerCase(),
              className: (item.className || '').slice(0, 30)
            });
          }
        }
      }

      return {
        hasHorizontalScroll,
        scrollWidth,
        innerWidth,
        overflowCount: overflowingElements.length,
        overflowingElements: overflowingElements.slice(0, 5),
        desktopNavVisible,
        menuToggleVisible,
        headerCollision,
        collisionDetails,
        smallTouchTargetsCount: smallTouchTargets.length,
        smallTouchTargets: smallTouchTargets.slice(0, 4)
      };
    }, vp.width);

    const statusMark = (auditData.hasHorizontalScroll || auditData.headerCollision) ? '❌ ISSUE' : '✓ OK';
    console.log(`[${statusMark}] ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`   Horizontal Scroll: ${auditData.hasHorizontalScroll ? `YES (scrollWidth: ${auditData.scrollWidth}px vs ${auditData.innerWidth}px)` : 'No'}`);
    if (auditData.overflowCount > 0) {
      console.log(`   Overflowing Elements (${auditData.overflowCount}):`);
      for (const el of auditData.overflowingElements) {
        console.log(`     - <${el.tag} class="${el.className}">: right ${el.right}px (+${el.excess}px)`);
      }
    }
    console.log(`   Navigation: Desktop Nav=${auditData.desktopNavVisible ? 'Visible' : 'Hidden'}, Toggle=${auditData.menuToggleVisible ? 'Visible' : 'Hidden'}`);
    if (auditData.headerCollision) {
      console.log(`   🚨 HEADER COLLISION DETECTED: ${auditData.collisionDetails}`);
    }
    if (auditData.smallTouchTargetsCount > 0) {
      console.log(`   Small touch targets (<32px): ${auditData.smallTouchTargetsCount}`);
      for (const t of auditData.smallTouchTargets) {
        console.log(`     - [${t.tag}] "${t.text}": ${t.w}x${t.h}px`);
      }
    }
    console.log('');
    await page.close();
  }

  await browser.close();
}

audit().catch(console.error);
