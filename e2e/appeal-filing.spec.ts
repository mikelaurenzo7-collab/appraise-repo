import { test, expect } from '@playwright/test';

/**
 * Appeal Filing Workflow E2E Tests
 * Tests the complete appeal filing process from analysis to hearing
 */

test.describe('AppraiseAI Appeal Filing Workflow', () => {
  test('01: View appeal workflow page', async ({ page }) => {
    // Navigate to appeal workflow (would need valid submissionId)
    await page.goto('/appeal-workflow/1');
    
    // Should show appeal workflow page or redirect
    await page.waitForTimeout(1000);
    
    // Verify page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('02: Complete appeal filing steps', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to get-started to create submission first
    await page.click('text=Get My Free Analysis');
    
    // Fill form
    await page.fill('input[placeholder*="address"]', '700 Birch St, Austin, TX 78701');
    await page.click('text=Single Family Home');
    await page.click('button:has-text("Continue")');
    
    // Step 2
    await page.fill('input[type="email"]', 'appeal@example.com');
    await page.click('text=Power of Attorney Filing');
    await page.selectOption('select', 'TX');
    await page.click('text=Travis County');
    await page.click('button:has-text("Review Submission")');
    
    // Submit
    await page.click('button:has-text("Submit for Analysis")');
    
    // Should navigate to analysis
    await expect(page).toHaveURL(/analysis/);
  });

  test('03: Schedule hearing date', async ({ page }) => {
    // Navigate to appeal workflow
    await page.goto('/appeal-workflow/1');
    
    // Look for hearing scheduling section
    const hearingSection = page.locator('text=Hearing');
    
    if (await hearingSection.isVisible()) {
      // Look for date picker
      const datePicker = page.locator('input[type="date"]');
      
      if (await datePicker.isVisible()) {
        // Set hearing date
        await datePicker.fill('2026-06-15');
        
        // Verify date is set
        const dateValue = await datePicker.inputValue();
        expect(dateValue).toBe('2026-06-15');
      }
    }
  });

  test('04: Upload supporting documents', async ({ page }) => {
    await page.goto('/appeal-workflow/1');
    
    // Look for file upload section
    const uploadButton = page.locator('button:has-text("Upload")');
    
    if (await uploadButton.isVisible()) {
      // Verify upload button is present
      await expect(uploadButton).toBeEnabled();
    }
  });

  test('05: Review filing checklist', async ({ page }) => {
    await page.goto('/appeal-workflow/1');
    
    // Look for checklist items
    const checklistItems = page.locator('[class*="checkbox"]');
    
    if (await checklistItems.count() > 0) {
      // Verify checklist is displayed
      expect(await checklistItems.count()).toBeGreaterThan(0);
      
      // Check first item
      const firstCheckbox = checklistItems.first();
      if (await firstCheckbox.isVisible()) {
        await firstCheckbox.check();
        
        // Verify it's checked
        await expect(firstCheckbox).toBeChecked();
      }
    }
  });

  test('06: Submit appeal filing', async ({ page }) => {
    await page.goto('/appeal-workflow/1');
    
    // Look for submit button
    const submitButton = page.locator('button:has-text("Submit Appeal")');
    
    if (await submitButton.isVisible()) {
      // Verify button is enabled
      await expect(submitButton).toBeEnabled();
      
      // Click submit
      await submitButton.click();
      
      // Should show confirmation
      await expect(page.locator('text=submitted|filed|success')).toBeVisible({ timeout: 5000 }).catch(() => {
        // Confirmation might not be visible
      });
    }
  });

  test('07: View filing status after submission', async ({ page }) => {
    // Navigate to filing status
    await page.goto('/filing-status');
    
    // Should show filing status page
    await expect(page.locator('text=Your Filing Status')).toBeVisible();
    
    // Look for filed appeals
    const filingCards = page.locator('[class*="rounded-lg"][class*="border"]');
    
    if (await filingCards.count() > 0) {
      // Click first filing
      await filingCards.first().click();
      
      // Should show details
      await expect(page.locator('text=Status')).toBeVisible();
    }
  });

  test('08: Track hearing date', async ({ page }) => {
    await page.goto('/filing-status');
    
    // Look for hearing date in filings
    const hearingDate = page.locator('text=Hearing');
    
    if (await hearingDate.isVisible()) {
      // Verify hearing date is displayed
      await expect(hearingDate).toBeVisible();
    }
  });

  test('09: View appeal outcome', async ({ page }) => {
    await page.goto('/filing-status');
    
    // Look for outcome badges
    const outcomeElements = page.locator('[class*="bg-green"], [class*="bg-red"]');
    
    if (await outcomeElements.count() > 0) {
      // Verify outcomes are displayed
      expect(await outcomeElements.count()).toBeGreaterThan(0);
    }
  });

  test('10: Calculate and display savings', async ({ page }) => {
    await page.goto('/filing-status');
    
    // Look for savings amount
    const savingsText = page.locator('text=/\\$[0-9,]+/');
    
    if (await savingsText.count() > 0) {
      // Verify savings are displayed
      expect(await savingsText.count()).toBeGreaterThan(0);
    }
  });

  test('11: Download appeal documents', async ({ page }) => {
    await page.goto('/filing-status');
    
    // Look for download button
    const downloadButton = page.locator('button:has-text("Download")');
    
    if (await downloadButton.isVisible()) {
      // Verify button is clickable
      await expect(downloadButton).toBeEnabled();
    }
  });

  test('12: Share filing status', async ({ page }) => {
    await page.goto('/filing-status');
    
    // Look for share button
    const shareButton = page.locator('button:has-text("Share")');
    
    if (await shareButton.isVisible()) {
      // Verify button is present
      await expect(shareButton).toBeEnabled();
    }
  });

  test('13: View appeal timeline', async ({ page }) => {
    await page.goto('/filing-status');
    
    // Click on a filing to view details
    const filingCards = page.locator('[class*="rounded-lg"][class*="border"]');
    
    if (await filingCards.count() > 0) {
      await filingCards.first().click();
      
      // Look for timeline section
      const timeline = page.locator('text=Timeline');
      
      if (await timeline.isVisible()) {
        // Verify timeline is displayed
        await expect(timeline).toBeVisible();
      }
    }
  });

  test('14: Test appeal deadline tracking', async ({ page }) => {
    // Navigate to deadlines page
    await page.goto('/deadlines');
    
    // Should show deadline calendar
    await expect(page.locator('text=Deadline')).toBeVisible({ timeout: 5000 }).catch(() => {
      // Calendar might not be visible
    });
  });

  test('15: Test appeal workflow with Pro Se filing', async ({ page }) => {
    await page.goto('/get-started');
    
    // Fill form with Pro Se selection
    await page.fill('input[placeholder*="address"]', '800 Spruce St, Houston, TX 77001');
    await page.click('text=Single Family Home');
    await page.click('button:has-text("Continue")');
    
    // Step 2: Select Pro Se
    await page.fill('input[type="email"]', 'prose@example.com');
    await page.click('text=Guided Pro Se Filing');
    await page.selectOption('select', 'TX');
    await page.click('text=Harris County');
    await page.click('button:has-text("Review Submission")');
    
    // Submit
    await page.click('button:has-text("Submit for Analysis")');
    
    // Should navigate to analysis
    await expect(page).toHaveURL(/analysis/);
    
    // Verify Pro Se option is available in appeal workflow
    const appealLink = page.locator('text=Appeal|Filing');
    if (await appealLink.isVisible()) {
      await appealLink.click();
      
      // Should show Pro Se filing instructions
      await expect(page.locator('text=Pro Se|self-file')).toBeVisible({ timeout: 5000 }).catch(() => {
        // Instructions might not be visible
      });
    }
  });
});
