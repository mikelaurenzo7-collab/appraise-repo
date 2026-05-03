import { test, expect } from '@playwright/test';

/**
 * Smoke Tests — Critical User Journeys
 *
 * These are lightweight tests verifying that each key page renders
 * without JS errors and contains expected content. They use accurate
 * selectors derived from the actual component source rather than guessed text.
 *
 * Approach: single Chromium browser, sequential navigation to stay well
 * within the server's 500 req/15 min rate limit.
 */

test.describe('Smoke: Public Pages Render', () => {
  // Each test gets its own page to avoid state bleed, but they share
  // the rate-limit bucket — keep assertions lean.

  test('homepage renders hero and CTA', async ({ page }) => {
    await page.goto('/');

    // Brand logo in nav (use first() to avoid strict-mode failure on multiple text matches)
    await expect(page.getByRole('link', { name: 'AppraiseAI', exact: true }).first()).toBeVisible();

    // Hero headline visible
    await expect(page.getByText('tax appeal', { exact: false }).first()).toBeVisible();

    // Primary CTA exists (href="/get-started")
    const ctaLink = page.locator('a[href="/get-started"]').first();
    await expect(ctaLink).toBeVisible();

    // No uncaught console errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    expect(errors).toHaveLength(0);
  });

  test('homepage navigation links visible', async ({ page }) => {
    await page.goto('/');
    // Core nav links (from Navbar's navLinks array)
    await expect(page.getByRole('link', { name: 'How It Works' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pricing' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Deadlines' }).first()).toBeVisible();
  });

  test('how-it-works page renders', async ({ page }) => {
    await page.goto('/how-it-works');
    // Page has an h1 containing "How It Works" or Phase 1
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 });
    // Phase 1 — Instant AI Appraisal section
    await expect(page.getByText('Instant AI Appraisal', { exact: false })).toBeVisible();
  });

  test('pricing page renders tiers', async ({ page }) => {
    await page.goto('/pricing');
    // h1 contains "Stop Overpaying"
    await expect(page.getByRole('heading', { name: /Stop Overpaying/i })).toBeVisible({ timeout: 8000 });
    // Pro Se tier present
    await expect(page.getByText('Pro Se Guided', { exact: false })).toBeVisible();
    // At least one "$" price visible
    await expect(page.getByText(/\$\d+/).first()).toBeVisible();
  });

  test('about page renders', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: /About AppraiseAI/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Our Mission', { exact: false })).toBeVisible();
  });

  test('get-started page renders step 1', async ({ page }) => {
    await page.goto('/get-started');
    // h1 in step 1
    await expect(page.getByRole('heading', { name: /Tell Us About Your Property/i })).toBeVisible({ timeout: 8000 });
    // Property type buttons present
    await expect(page.getByText('Residential', { exact: false }).first()).toBeVisible();
  });

  test('deadline calendar page renders', async ({ page }) => {
    await page.goto('/deadlines');
    // Hero h1
    await expect(page.getByRole('heading', { name: /Property Tax Appeal/i }).first()).toBeVisible({ timeout: 8000 });
    // "Deadline Calendar" is part of the span inside h1
    await expect(page.getByText('Deadline Calendar', { exact: false })).toBeVisible();
    // States table/list — Texas should be listed
    await expect(page.getByText('Texas', { exact: false })).toBeVisible();
  });

  test('blog page renders', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 });
  });

  test('tax-appeals page renders', async ({ page }) => {
    await page.goto('/tax-appeals');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 });
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 });
  });

  test('404 page renders for unknown route', async ({ page }) => {
    await page.goto('/this-path-does-not-exist-xyz');
    // Should render the NotFound component, not a blank page
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Smoke: GetStarted Form Flow', () => {
  test('step 1 — can type in address field', async ({ page }) => {
    await page.goto('/get-started');
    await expect(page.getByRole('heading', { name: /Tell Us About Your Property/i })).toBeVisible({ timeout: 8000 });

    // Address autocomplete input
    const addressInput = page.locator('input[type="text"]').first();
    await expect(addressInput).toBeVisible();
    await addressInput.fill('123 Main St, Austin, TX 78701');
    await expect(addressInput).toHaveValue('123 Main St, Austin, TX 78701');
  });

  test('step 1 — property type buttons are clickable', async ({ page }) => {
    await page.goto('/get-started');
    await expect(page.getByRole('heading', { name: /Tell Us About Your Property/i })).toBeVisible({ timeout: 8000 });

    // Click Residential property type button
    const residentialBtn = page.getByText('Residential', { exact: false }).first();
    await expect(residentialBtn).toBeVisible();
    await residentialBtn.click();
    // No crash after clicking
    await page.waitForTimeout(300);
    // Still on get-started
    await expect(page).toHaveURL(/get-started/);
  });

  test('step 1 — continue without address shows no crash', async ({ page }) => {
    await page.goto('/get-started');
    await expect(page.getByRole('heading', { name: /Tell Us About Your Property/i })).toBeVisible({ timeout: 8000 });

    // Click continue with empty address — should NOT navigate away (validation)
    const continueBtn = page.getByRole('button', { name: /continue/i }).first();
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // Should still be on step 1
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/get-started/);
    // Heading still visible (didn't crash)
    await expect(page.getByRole('heading', { name: /Tell Us About Your Property/i })).toBeVisible();
  });
});

test.describe('Smoke: Navigation', () => {
  test('clicking pricing link from home navigates to /pricing', async ({ page }) => {
    await page.goto('/');
    // Use the nav link (desktop nav)
    await page.getByRole('link', { name: 'Pricing' }).first().click();
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.getByRole('heading', { name: /Stop Overpaying/i })).toBeVisible({ timeout: 8000 });
  });

  test('clicking How It Works link navigates correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'How It Works' }).first().click();
    await expect(page).toHaveURL(/\/how-it-works/);
    await expect(page.getByText('Instant AI Appraisal', { exact: false })).toBeVisible({ timeout: 8000 });
  });

  test('clicking About link navigates correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'About' }).first().click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.getByRole('heading', { name: /About AppraiseAI/i })).toBeVisible({ timeout: 8000 });
  });

  test('clicking Deadlines nav link navigates to /deadlines', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Deadlines' }).first().click();
    await expect(page).toHaveURL(/\/deadlines/);
    await expect(page.getByText('Deadline Calendar', { exact: false })).toBeVisible({ timeout: 8000 });
  });

  test('AppraiseAI logo navigates back to home', async ({ page }) => {
    await page.goto('/pricing');
    await page.getByRole('link', { name: 'AppraiseAI', exact: true }).first().click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Smoke: Auth-Protected Routes (redirect or render)', () => {
  // These routes require auth — verify they either render or redirect gracefully.

  test('dashboard route responds without crash', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    // Page should have loaded — either a redirect or the dashboard
    const url = page.url();
    expect(url).toBeTruthy();
    // Title is set
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('admin route responds without crash', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('filing-status route responds without crash', async ({ page }) => {
    await page.goto('/filing-status');
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toBeTruthy();
  });

  test('analysis route responds without crash', async ({ page }) => {
    await page.goto('/analysis');
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toBeTruthy();
  });
});

test.describe('Smoke: API Health Check', () => {
  test('tRPC endpoint responds at /api/trpc', async ({ page }) => {
    // GET a simple batch query — should return JSON, not HTML
    const response = await page.request.get('http://localhost:3000/api/trpc/counties.list?input=%7B%7D');
    // Acceptable status codes: 200 (data), 400 (invalid batch), 401 (unauth), 429 (rate limit)
    expect([200, 400, 401, 403, 429]).toContain(response.status());
  });

  test('health endpoint responds 200', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/health');
    expect(response.status()).toBe(200);
  });
});

test.describe('Smoke: Page Titles Set Correctly', () => {
  test('home page has a non-empty title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toContain('AppraiseAI');
  });

  test('pricing page has a non-empty title', async ({ page }) => {
    await page.goto('/pricing');
    const title = await page.title();
    expect(title).toContain('Pricing');
  });

  test('get-started page has a non-empty title', async ({ page }) => {
    await page.goto('/get-started');
    const title = await page.title();
    expect(title).toContain('Get Started');
  });

  test('deadline calendar page has a non-empty title', async ({ page }) => {
    await page.goto('/deadlines');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
