import { test, expect } from '@playwright/test';

test.describe('Requirements Board - Customer View Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Assuming the app is running on localhost:5173
    await page.goto('http://localhost:5173/requirements');
  });

  test('should expand a customer group and render actions', async ({ page }) => {
    await page.waitForSelector('text=active requirements');
    
    // Check if there's at least one customer panel
    const customerPanel = page.locator('.glass-panel').first();
    if (await customerPanel.isVisible()) {
      // Click to expand (the header div is clickable)
      const expandHeader = customerPanel.locator('div').first();
      await expandHeader.click();

      // Table should now be visible
      const table = customerPanel.locator('table');
      await expect(table).toBeVisible();

      // More actions button should be visible in the first row
      const moreActionsBtn = table.locator('button[aria-label="More actions"]').first();
      await expect(moreActionsBtn).toBeVisible();
    }
  });

  test('should open cancellation modal and cancel a requirement', async ({ page }) => {
    await page.waitForSelector('text=active requirements');
    
    const customerPanel = page.locator('.glass-panel').first();
    if (await customerPanel.isVisible()) {
      await customerPanel.locator('div').first().click(); // expand
      
      const moreActionsBtn = customerPanel.locator('table button[aria-label="More actions"]').first();
      if (await moreActionsBtn.isVisible()) {
        await moreActionsBtn.click();
        
        const cancelBtn = page.locator('button:has-text("Cancel requirement")').first();
        await cancelBtn.click();
        
        const modalTitle = page.locator('h3:has-text("Cancel this requirement?")');
        await expect(modalTitle).toBeVisible();

        const confirmModalBtn = page.locator('div[role="dialog"] button:has-text("Cancel requirement")');
        await confirmModalBtn.click();
        
        const toast = page.locator('text=Requirement cancelled successfully.');
        await expect(toast).toBeVisible();
      }
    }
  });

  test('should open permanent delete modal and delete a requirement', async ({ page }) => {
    await page.waitForSelector('text=active requirements');
    
    const customerPanel = page.locator('.glass-panel').first();
    if (await customerPanel.isVisible()) {
      await customerPanel.locator('div').first().click(); // expand
      
      const moreActionsBtn = customerPanel.locator('table button[aria-label="More actions"]').first();
      if (await moreActionsBtn.isVisible()) {
        await moreActionsBtn.click();
        
        const deleteBtn = page.locator('button:has-text("Delete permanently")').first();
        await deleteBtn.click();
        
        const modalTitle = page.locator('h3:has-text("Permanently delete this requirement?")');
        await expect(modalTitle).toBeVisible();

        const confirmModalBtn = page.locator('div[role="dialog"] button:has-text("Delete permanently")');
        await confirmModalBtn.click();
        
        const toast = page.locator('text=Requirement deleted.');
        await expect(toast).toBeVisible();
      }
    }
  });
});
