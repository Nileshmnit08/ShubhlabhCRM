import { test, expect } from '@playwright/test';

test.describe('Requirements Board - Delete Requirement', () => {
  test.beforeEach(async ({ page }) => {
    // Assuming the app is running on localhost:5173 (standard vite port)
    // and /requirements is the route.
    await page.goto('http://localhost:5173/requirements');
  });

  test('should open overflow menu and render the delete button', async ({ page }) => {
    // Wait for cards to load
    await page.waitForSelector('text=Showing');
    
    // Find the more actions button
    const moreActionsBtn = page.locator('button[aria-label="More actions"]').first();
    await expect(moreActionsBtn).toBeVisible();
    
    // Click it to open menu
    await moreActionsBtn.click();
    
    // Check if delete button is visible
    const deleteBtn = page.locator('button:has-text("Delete")').first();
    await expect(deleteBtn).toBeVisible();
  });

  test('should open confirmation modal when delete is clicked and not navigate', async ({ page }) => {
    await page.waitForSelector('text=Showing');
    const moreActionsBtn = page.locator('button[aria-label="More actions"]').first();
    await moreActionsBtn.click();
    
    const deleteBtn = page.locator('button:has-text("Delete")').first();
    
    // Get the current URL
    const urlBeforeClick = page.url();
    
    // Click the delete button
    await deleteBtn.click();
    
    // Verify modal is open
    const modalTitle = page.locator('h3:has-text("Delete requirement?")');
    await expect(modalTitle).toBeVisible();
    
    // Verify no navigation occurred
    expect(page.url()).toBe(urlBeforeClick);
  });

  test('should close modal without deleting when cancel is clicked', async ({ page }) => {
    await page.waitForSelector('text=Showing');
    const moreActionsBtn = page.locator('button[aria-label="More actions"]').first();
    await moreActionsBtn.click();
    
    const deleteBtn = page.locator('button:has-text("Delete")').first();
    await deleteBtn.click();
    
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    
    // Modal should disappear
    const modalTitle = page.locator('h3:has-text("Delete requirement?")');
    await expect(modalTitle).not.toBeVisible();
  });

  test('should successfully delete and show toast when confirmed', async ({ page }) => {
    await page.waitForSelector('text=Showing');
    
    const moreActionsBtn = page.locator('button[aria-label="More actions"]').first();
    if (await moreActionsBtn.isVisible()) {
      await moreActionsBtn.click();
      
      const deleteBtn = page.locator('button:has-text("Delete")').first();
      await deleteBtn.click();
      
      const confirmBtn = page.locator('button:has-text("Delete")').nth(1); // the modal confirm button is also "Delete"
      // Alternatively, explicitly wait for the modal button
      const confirmModalBtn = page.locator('div[role="dialog"] button:has-text("Delete")');
      await confirmModalBtn.click();
      
      // Expect toast to appear
      const toast = page.locator('text=Requirement deleted successfully.');
      await expect(toast).toBeVisible();
      
      // Modal should be closed
      const modalTitle = page.locator('h3:has-text("Delete requirement?")');
      await expect(modalTitle).not.toBeVisible();
    }
  });
});
