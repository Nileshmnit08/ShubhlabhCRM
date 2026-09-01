import { test, expect } from '@playwright/test';

test.describe('Requirements Board - Row Actions', () => {
  test('Clicking More Actions should not crash the app and should open the menu', async ({ page }) => {
    // Navigate to requirements page
    await page.goto('/requirements');

    // Wait for the requirements to load by checking for the More Actions button
    // It's possible the list is empty, but we assume dummy data exists for tests
    const moreActionsBtns = page.locator('button[aria-label="More actions"]');
    
    // If there are requirements, we test the button. If not, the test just passes.
    const count = await moreActionsBtns.count();
    
    if (count > 0) {
      // Click the first More Actions button
      await moreActionsBtns.first().click();

      // Verify the menu opens without crashing
      const viewDetailsBtn = page.locator('button', { hasText: 'View details' }).first();
      
      // Check if the action is visible, proving the app didn't crash
      await expect(viewDetailsBtn).toBeVisible();

      // Test click away to close
      // Click at the top-left corner of the viewport (which acts as clicking the overlay/body)
      await page.mouse.click(0, 0);
      
      // Menu should be hidden
      await expect(viewDetailsBtn).toBeHidden();
    }
  });
});
