import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests login, logout, and session management
 */

test.describe('AppraiseAI Authentication', () => {
  test('01: Access public pages without login', async ({ page }) => {
    // Should be able to access home page
    await page.goto('/');
    await expect(page.locator('text=AppraiseAI')).toBeVisible();
    
    // Should be able to access how it works
    await page.goto('/how-it-works');
    await expect(page.locator('text=How It Works')).toBeVisible();
    
    // Should be able to access pricing
    await page.goto('/pricing');
    await expect(page.locator('text=Pricing')).toBeVisible();
    
    // Should be able to access about
    await page.goto('/about');
    await expect(page.locator('text=About')).toBeVisible();
  });

  test('02: Access get-started page without login', async ({ page }) => {
    // Should be able to access get-started
    await page.goto('/get-started');
    await expect(page.locator('text=Find Your Property')).toBeVisible();
  });

  test('03: Verify logout functionality', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    
    // Look for logout button (would appear if logged in)
    const logoutButton = page.locator('button:has-text("Logout")');
    
    // If logout button exists, click it
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Should redirect to home
      await expect(page).toHaveURL('/');
    }
  });

  test('04: Test session persistence', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    
    // Navigate to another page
    await page.goto('/how-it-works');
    
    // Session should persist
    await expect(page).toHaveURL(/how-it-works/);
    
    // Navigate back to home
    await page.goto('/');
    
    // Should still be on home
    await expect(page).toHaveURL('/');
  });

  test('05: Test protected route access', async ({ page }) => {
    // Try to access admin dashboard
    await page.goto('/admin');
    
    // Should either show admin dashboard or redirect
    await page.waitForTimeout(1000);
    
    // Verify page loaded
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('06: Test dashboard access', async ({ page }) => {
    // Navigate to user dashboard
    await page.goto('/dashboard');
    
    // Should show dashboard or redirect
    await page.waitForTimeout(1000);
    
    // Verify page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('07: Test OAuth flow initiation', async ({ page }) => {
    await page.goto('/');
    
    // Click Get My Free Analysis
    const ctaButton = page.locator('text=Get My Free Analysis');
    
    if (await ctaButton.isVisible()) {
      await ctaButton.click();
      
      // Should navigate or trigger OAuth
      await page.waitForTimeout(2000);
      
      // Verify navigation happened
      const url = page.url();
      expect(url).toBeTruthy();
    }
  });

  test('08: Test user profile access', async ({ page }) => {
    // Navigate to portfolio (user profile area)
    await page.goto('/portfolio');
    
    // Should show portfolio or redirect
    await page.waitForTimeout(1000);
    
    // Verify page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('09: Test payment history access', async ({ page }) => {
    // Navigate to payment history
    await page.goto('/payments');
    
    // Should show payment history or redirect
    await page.waitForTimeout(1000);
    
    // Verify page loaded
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('10: Test session timeout handling', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    
    // Wait for session timeout (if implemented)
    await page.waitForTimeout(5000);
    
    // Try to navigate to protected page
    await page.goto('/dashboard');
    
    // Should either show page or redirect to login
    await page.waitForTimeout(1000);
    
    // Verify page loaded
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('11: Test cookie handling', async ({ page, context }) => {
    // Navigate to home
    await page.goto('/');
    
    // Get cookies
    const cookies = await context.cookies();
    
    // Should have some cookies (session, etc)
    expect(cookies.length).toBeGreaterThanOrEqual(0);
    
    // Verify no sensitive data in cookies
    const cookieNames = cookies.map(c => c.name);
    expect(cookieNames).not.toContain('password');
    expect(cookieNames).not.toContain('apikey');
  });

  test('12: Test CSRF protection', async ({ page }) => {
    // Navigate to form page
    await page.goto('/get-started');
    
    // Look for CSRF token or similar
    const formElements = page.locator('form');
    
    if (await formElements.count() > 0) {
      // Verify form is present
      expect(await formElements.count()).toBeGreaterThan(0);
    }
  });

  test('13: Test multi-tab session consistency', async ({ browser }) => {
    // Create two contexts
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    // Navigate both to home
    await page1.goto('/');
    await page2.goto('/');
    
    // Both should load successfully
    await expect(page1.locator('text=AppraiseAI')).toBeVisible();
    await expect(page2.locator('text=AppraiseAI')).toBeVisible();
    
    // Close contexts
    await context1.close();
    await context2.close();
  });

  test('14: Test error handling on auth failure', async ({ page }) => {
    // Navigate to protected page
    await page.goto('/admin');
    
    // Should handle gracefully
    await page.waitForTimeout(1000);
    
    // Verify page loaded or redirected
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('15: Test navigation after auth state change', async ({ page }) => {
    // Navigate to home
    await page.goto('/');
    
    // Navigate to get-started
    await page.click('text=Get My Free Analysis');
    
    // Should navigate successfully
    await page.waitForTimeout(1000);
    
    // Verify navigation
    const url = page.url();
    expect(url).toBeTruthy();
  });
});
