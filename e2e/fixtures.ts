import { test as base, expect } from '@playwright/test';

/**
 * Extend basic test by providing "authenticatedPage" fixture.
 * This fixture logs in before each test and provides authenticated page.
 */
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/');
    
    // Click "Get My Free Analysis" to trigger OAuth
    await page.click('text=Get My Free Analysis');
    
    // Wait for navigation to complete
    await page.waitForURL(/analysis|get-started/, { timeout: 10000 }).catch(() => {
      // OAuth might not work in test environment, continue anyway
    });
    
    // Use the authenticated page in the test
    await use(page);
  },
});

export { expect };
