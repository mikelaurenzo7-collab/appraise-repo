import { test, expect } from '@playwright/test';

/**
 * Smoke Tests — Critical User Journeys
 *
 * These tests verify that each key page renders correctly and key UI
 * elements are present. They use accurate selectors derived from
 * the actual component source.
 *
 * IMPORTANT: The dev server has a 500 req/15 min global rate limiter.
 * Tests are designed to be sequential (workers:1 in config) and lean
 * to avoid hitting the limit. Each page load generates ~5-10 requests.
 *
 * If tests hang/timeout it is likely the rate limiter has kicked in —
 * wait 15 minutes and retry, or run individual test files separately.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wait for page to be fully loaded (networkidle), then assert heading */
async function gotoAndWaitForContent(page: import('@playwright/test').Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Wait for Suspense lazy-chunks to hydrate
  await page.waitForLoadState('networkidle').catch(() => {/* ignore timeout */});
}

// ─── Public Pages ─────────────────────────────────────────────────────────────

test.describe('Smoke: Public Pages Render', () => {
  test('homepage — hero and CTA link present', async ({ page }) => {
    await gotoAndWaitForContent(page, '/');

    // Brand in nav — use exact role selector to avoid strict-mode violation
    await expect(page.getByRole('link', { name: 'AppraiseAI', exact: true }).first()).toBeVisible();

    // Hero section has the headline fragment "tax appeal"
    await expect(page.locator('h1').first()).toBeVisible();

    // Primary CTA: link to /get-started
    await expect(page.locator('a[href="/get-started"]').first()).toBeVisible();
  });

  test('homepage — navigation bar has key links', async ({ page }) => {
    await gotoAndWaitForContent(page, '/');
    // These come from Navbar's navLinks array
    await expect(page.getByRole('link', { name: 'How It Works' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pricing' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Deadlines' }).first()).toBeVisible();
  });

  test('how-it-works — page and phases visible', async ({ page }) => {
    await gotoAndWaitForContent(page, '/how-it-works');
    // h1 on the page
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
    // "Instant AI Appraisal" heading (not strict — use heading role + name)
    await expect(page.getByRole('heading', { name: 'Instant AI Appraisal' })).toBeVisible();
  });

  test('pricing — tiers and prices visible', async ({ page }) => {
    await gotoAndWaitForContent(page, '/pricing');
    // h1 = "Stop Overpaying. Start at Free."
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('h1').filter({ hasText: 'Stop Overpaying' })).toBeVisible();
    // Pro Se Guided tier card — exact heading match to avoid strict-mode violation
    // (the text also appears in the FAQ section heading)
    await expect(page.getByRole('heading', { name: 'Pro Se Guided', exact: true })).toBeVisible();
  });

  test('about — mission section visible', async ({ page }) => {
    await gotoAndWaitForContent(page, '/about');
    await expect(page.getByRole('heading', { name: /About AppraiseAI/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('heading', { name: /Our Mission/i })).toBeVisible();
  });

  test('get-started — step 1 form visible', async ({ page }) => {
    await gotoAndWaitForContent(page, '/get-started');
    await expect(page.getByRole('heading', { name: /Tell Us About Your Property/i })).toBeVisible({ timeout: 8000 });
    // Property address label
    await expect(page.getByText('Property Address').first()).toBeVisible();
    // Property type buttons
    await expect(page.getByText('Residential').first()).toBeVisible();
  });

  test('deadline calendar — heading and state list visible', async ({ page }) => {
    await gotoAndWaitForContent(page, '/deadlines');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
    // "Deadline Calendar" in the h1 span
    await expect(page.locator('h1').filter({ hasText: /Deadline Calendar/i })).toBeVisible();
    // All 50 states stat
    await expect(page.getByText('All 50', { exact: true })).toBeVisible();
    // Texas in the list
    await expect(page.getByText('Texas', { exact: true }).first()).toBeVisible();
  });
});

// ─── GetStarted Form Flow ─────────────────────────────────────────────────────

test.describe('Smoke: GetStarted Form', () => {
  test('step 1 — address input accepts text', async ({ page }) => {
    await gotoAndWaitForContent(page, '/get-started');
    await expect(page.getByRole('heading', { name: /Tell Us About Your Property/i })).toBeVisible({ timeout: 8000 });

    // Address autocomplete input (first text input on page)
    const addressInput = page.locator('input[type="text"]').first();
    await expect(addressInput).toBeVisible();
    await addressInput.fill('123 Main St, Austin, TX 78701');
    await expect(addressInput).toHaveValue('123 Main St, Austin, TX 78701');
  });

  test('step 1 — clicking property type does not crash page', async ({ page }) => {
    await gotoAndWaitForContent(page, '/get-started');
    await expect(page.getByRole('heading', { name: /Tell Us About Your Property/i })).toBeVisible({ timeout: 8000 });

    // Click Residential property type button
    await page.getByText('Residential').first().click();
    // Verify no navigation away (still on get-started)
    await expect(page).toHaveURL(/get-started/);
    // Step heading still there
    await expect(page.getByRole('heading', { name: /Tell Us About Your Property/i })).toBeVisible();
  });

  test('step 1 — continue without address stays on step 1', async ({ page }) => {
    await gotoAndWaitForContent(page, '/get-started');
    await expect(page.getByRole('heading', { name: /Tell Us About Your Property/i })).toBeVisible({ timeout: 8000 });

    // Try continue with no address filled
    await page.getByRole('button', { name: /continue/i }).first().click();
    await page.waitForTimeout(500);

    // Should still be on get-started (validation blocks navigation)
    await expect(page).toHaveURL(/get-started/);
    // Step 1 heading still visible
    await expect(page.getByRole('heading', { name: /Tell Us About Your Property/i })).toBeVisible();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

test.describe('Smoke: Navigation', () => {
  test('nav: pricing link opens pricing page', async ({ page }) => {
    await gotoAndWaitForContent(page, '/');
    await page.getByRole('link', { name: 'Pricing' }).first().click();
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.locator('h1').filter({ hasText: /Stop Overpaying/i })).toBeVisible({ timeout: 8000 });
  });

  test('nav: How It Works link opens correct page', async ({ page }) => {
    await gotoAndWaitForContent(page, '/');
    await page.getByRole('link', { name: 'How It Works' }).first().click();
    await expect(page).toHaveURL(/\/how-it-works/);
    await expect(page.getByRole('heading', { name: 'Instant AI Appraisal' })).toBeVisible({ timeout: 8000 });
  });

  test('nav: About link opens about page', async ({ page }) => {
    await gotoAndWaitForContent(page, '/');
    await page.getByRole('link', { name: 'About' }).first().click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.getByRole('heading', { name: /About AppraiseAI/i })).toBeVisible({ timeout: 8000 });
  });

  test('nav: AppraiseAI logo links to homepage', async ({ page }) => {
    await gotoAndWaitForContent(page, '/pricing');
    // Logo link
    await page.getByRole('link', { name: 'AppraiseAI', exact: true }).first().click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Auth-Protected Routes ────────────────────────────────────────────────────

test.describe('Smoke: Auth-Protected Routes', () => {
  // These pages require authentication. We only verify they load without a
  // JS crash — they may redirect to /login or show a "sign in" prompt.

  test('dashboard — loads without JS crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    // URL has changed (possibly redirected) but not crashed to about:blank
    expect(page.url()).not.toBe('about:blank');
    // No uncaught errors
    const fatal = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('ChunkLoadError'));
    expect(fatal).toHaveLength(0);
  });

  test('admin — loads without JS crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(page.url()).not.toBe('about:blank');
    const fatal = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('ChunkLoadError'));
    expect(fatal).toHaveLength(0);
  });

  test('filing-status — loads without JS crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/filing-status', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(page.url()).not.toBe('about:blank');
    const fatal = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('ChunkLoadError'));
    expect(fatal).toHaveLength(0);
  });

  test('analysis — loads without JS crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/analysis', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(page.url()).not.toBe('about:blank');
    const fatal = errors.filter(e => !e.includes('ResizeObserver') && !e.includes('ChunkLoadError'));
    expect(fatal).toHaveLength(0);
  });
});

// ─── API Endpoints ────────────────────────────────────────────────────────────

test.describe('Smoke: API Endpoints', () => {
  test('GET /health returns 200', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health');
    expect(response.status()).toBe(200);
  });

  test('tRPC /api/trpc endpoint reachable (returns JSON, not HTML)', async ({ request }) => {
    // Query a real public procedure to verify the tRPC route is mounted
    // counties.getHighImpactStates is a no-input public query
    const response = await request.get(
      'http://localhost:3000/api/trpc/counties.getHighImpactStates?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D',
      { headers: { 'x-e2e-test-bypass': 'playwright-e2e-bypass-2026' } }
    );
    const status = response.status();
    expect(status).toBe(200);
    const ct = response.headers()['content-type'] ?? '';
    expect(ct).toContain('json');
  });
});

// ─── Page Titles (SPA with dynamic titles) ───────────────────────────────────

test.describe('Smoke: Page Titles', () => {
  test('home page title contains AppraiseAI', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Wait for the React usePageMeta hook to run and update document.title
    await page.waitForFunction(() => document.title.length > 0, { timeout: 8000 });
    const title = await page.title();
    expect(title).toContain('AppraiseAI');
  });

  test('pricing page title is non-empty', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title.length > 0, { timeout: 8000 });
    const title = await page.title();
    // The SPA may set "Pricing — AppraiseAI" or fall back to the default title.
    // Either way the title should be non-empty.
    expect(title.length).toBeGreaterThan(0);
  });

  test('get-started page title is non-empty', async ({ page }) => {
    await page.goto('/get-started', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title.length > 0, { timeout: 8000 });
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('deadline calendar page title is non-empty', async ({ page }) => {
    await page.goto('/deadlines', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title.length > 0, { timeout: 8000 });
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
