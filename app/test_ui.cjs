const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to CRM...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    // Handle login if needed
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('Logging in...');
      await page.type('input[type="email"]', 'admin@shubhlabh.com');
      await page.type('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    console.log('Going to Customer Price Publishing...');
    await page.goto('http://localhost:5173/raw-material-prices/daily-entry', { waitUntil: 'networkidle2' });

    await page.waitForSelector('h2');
    
    // Check override broker
    await page.evaluate(() => {
      const cb = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(c => c.closest('label').innerText.includes('Override'));
      if (cb && !cb.checked) cb.click();
    });

    const materials = [
      { name: 'Khal', price: '1800' },
      { name: 'Makka Daliya', price: '2200' },
      { name: 'Jaggery', price: '4000' },
      { name: 'Oil', price: '125' },
      { name: 'Chana Churi', price: '3000' },
      { name: 'Soya Churi', price: '3500' },
      { name: 'Kakde', price: '2500' },
      { name: 'Kakde Khal', price: '1600' },
      { name: 'Mustard Khal', price: '2200' },
    ];

    console.log('Entering today prices...');
    for (const mat of materials) {
      await page.waitForTimeout(500);
      
      await page.evaluate((matName) => {
        const selects = document.querySelectorAll('select');
        const matSelect = selects[0];
        for (const option of matSelect.options) {
          if (option.text.includes(matName) && (matName !== 'Khal' || !option.text.includes('Kakde') && !option.text.includes('Mustard'))) {
            matSelect.value = option.value;
            matSelect.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      }, mat.name);

      await page.waitForTimeout(500);

      await page.evaluate((priceStr) => {
        const selects = document.querySelectorAll('.bg-white.rounded-xl.border select');
        if (selects[1] && selects[1].options.length > 1) {
          selects[1].value = selects[1].options[1].value;
          selects[1].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (selects[2] && selects[2].options.length > 1) {
          selects[2].value = selects[2].options[1].value;
          selects[2].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (selects[3] && selects[3].options.length > 1 && !selects[3].value) {
          selects[3].value = selects[3].options[1].value;
          selects[3].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (selects[4] && selects[4].options.length > 1 && !selects[4].value) {
          selects[4].value = selects[4].options[1].value;
          selects[4].dispatchEvent(new Event('change', { bubbles: true }));
        }
        const priceInput = document.querySelector('input[type="number"]');
        if (priceInput) {
          priceInput.value = priceStr;
          priceInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const inputs = document.querySelectorAll('input[type="text"]');
        const remarkInput = inputs[inputs.length - 1];
        if (remarkInput) {
          remarkInput.value = 'TEST — NOT FOR COMMERCIAL USE';
          remarkInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, mat.price);

      await page.waitForTimeout(500);

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const addBtn = btns.find(b => b.innerText.includes('Add Entry'));
        if (addBtn) addBtn.click();
      });
    }

    console.log('Saving today...');
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.innerText.includes('Save All Entries'));
      if (saveBtn) saveBtn.click();
    });

    await page.waitForTimeout(2000);
    console.log('Today prices saved.');

    console.log('Entering history for Khal...');
    const history = [
      { date: '2026-10-07', price: '1750' },
      { date: '2026-10-08', price: '1780' }
    ];

    for (const h of history) {
      await page.waitForTimeout(1000);
      
      await page.evaluate((d) => {
        if(document.querySelector('.text-red-500.hover\\:text-red-700')) {
             document.querySelector('.text-red-500.hover\\:text-red-700').click(); // clear previous unsaved
        }
      });
      await page.waitForTimeout(500);
      
      // Override date warning
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      
      await page.evaluate((d) => {
        const dateInput = document.querySelector('input[type="date"]');
        dateInput.value = d;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }, h.date);

      await page.waitForTimeout(500);

      await page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        const matSelect = selects[0];
        for (const option of matSelect.options) {
          if (option.text.includes('Khal') && !option.text.includes('Kakde') && !option.text.includes('Mustard')) {
            matSelect.value = option.value;
            matSelect.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      });

      await page.waitForTimeout(500);

      await page.evaluate((priceStr) => {
        const selects = document.querySelectorAll('.bg-white.rounded-xl.border select');
        if (selects[1] && selects[1].options.length > 1) {
          selects[1].value = selects[1].options[1].value;
          selects[1].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (selects[2] && selects[2].options.length > 1) {
          selects[2].value = selects[2].options[1].value;
          selects[2].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (selects[3] && selects[3].options.length > 1 && !selects[3].value) {
          selects[3].value = selects[3].options[1].value;
          selects[3].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (selects[4] && selects[4].options.length > 1 && !selects[4].value) {
          selects[4].value = selects[4].options[1].value;
          selects[4].dispatchEvent(new Event('change', { bubbles: true }));
        }
        const priceInput = document.querySelector('input[type="number"]');
        if (priceInput) {
          priceInput.value = priceStr;
          priceInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const inputs = document.querySelectorAll('input[type="text"]');
        const remarkInput = inputs[inputs.length - 1];
        if (remarkInput) {
          remarkInput.value = 'TEST — NOT FOR COMMERCIAL USE';
          remarkInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, h.price);

      await page.waitForTimeout(500);

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const addBtn = btns.find(b => b.innerText.includes('Add Entry'));
        if (addBtn) addBtn.click();
      });

      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const saveBtn = btns.find(b => b.innerText.includes('Save All Entries'));
        if (saveBtn) saveBtn.click();
      });
      await page.waitForTimeout(1000);
    }
    
    console.log('All tests completed successfully!');
  } catch (err) {
    console.error('Error during puppeteer execution:', err);
  } finally {
    await browser.close();
  }
})();
