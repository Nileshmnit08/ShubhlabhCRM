import { test, expect } from '@playwright/test';

test.describe('Multiple Pending Follow-ups Feature', () => {
  test('should allow creating multiple pending follow-ups for the same customer', async ({ page }) => {
    // Navigate to follow-ups page
    await page.goto('/follow-ups/new');
    
    // Select customer (assuming dummy data exists)
    await page.fill('input[placeholder="Search customer by name or mobile..."]', 'Arihant Traders');
    await page.click('text=Arihant Traders');

    // Fill first follow-up details
    await page.click('input[placeholder="Select or search a reason"]');
    await page.click('text=Meeting / Visit'); 
    await page.fill('textarea[placeholder="Type your notes here..."]', 'First follow-up test note');
    await page.fill('input[type="datetime-local"]', '2026-10-10T10:00');
    
    // Save first follow-up
    await page.click('button:has-text("Save")');
    
    // Should navigate away, assume success toast
    await expect(page).toHaveURL(/.*\/follow-ups.*/);

    // Navigate to create a second follow-up for the same customer
    await page.goto('/follow-ups/new');
    await page.fill('input[placeholder="Search customer by name or mobile..."]', 'Arihant Traders');
    await page.click('text=Arihant Traders');

    // Warning should appear indicating existing pending follow-ups
    await expect(page.locator('text=This customer already has')).toBeVisible();
    await expect(page.locator('text=You can still create a new follow-up.')).toBeVisible();

    // Proceed to create second follow-up
    await page.click('input[placeholder="Select or search a reason"]');
    await page.click('text=Meeting / Visit');
    await page.fill('textarea[placeholder="Type your notes here..."]', 'Second follow-up test note');
    await page.fill('input[type="datetime-local"]', '2026-10-11T10:00');

    // Save second follow-up - should not be blocked
    await page.click('button:has-text("Save")');

    // Should successfully navigate away
    await expect(page).toHaveURL(/.*\/follow-ups.*/);
  });
});
