/**
 * Draft filing recipes for three launch counties.
 *
 * IMPORTANT: These recipes are marked `verificationStatus: "draft"` and the
 * filing queue refuses to execute a draft recipe in production unless the
 * ALLOW_DRAFT_RECIPES environment variable is set to "1" (staging only).
 *
 * The selectors below are plausible placeholders derived from publicly-
 * available portal documentation. They MUST be verified against the live
 * portal by a human with Playwright Inspector before they can be promoted
 * from "draft" to "verified". That verification is a ~30 minute task per
 * county, and the result is a pinned recipe version that can be rolled
 * back if the portal changes.
 *
 * To run this seed locally:
 *   pnpm exec tsx server/seeds/filingRecipes.seed.ts
 *
 * To activate a recipe in staging:
 *   UPDATE filing_recipes SET verificationStatus = 'staging' WHERE id = X;
 *   ALLOW_DRAFT_RECIPES=1 node dist/index.js
 */

import type { Recipe } from "../services/filingRecipeEngine";

export interface RecipeSeed {
  countyCode: string;
  countyName: string;
  state: string;
  portalUrl: string;
  validFrom?: string; // YYYY-MM-DD
  validUntil?: string; // YYYY-MM-DD
  notes?: string;
  recipe: Recipe;
}

export const RECIPE_SEEDS: RecipeSeed[] = [
  {
    countyCode: "48453",
    countyName: "Travis County",
    state: "TX",
    portalUrl: "https://www.traviscad.org/",
    validFrom: "2026-03-01",
    validUntil: "2026-05-15",
    notes:
      "TCAD uses iFile for online protests. Login requires account number + online ID PIN from the notice. Protest season typically closes May 15.",
    recipe: {
      countyId: 0, // filled in by seeder based on county lookup
      version: 1,
      portalUrl: "https://www.traviscad.org/ifile-login/",
      steps: [
        { action: "goto", url: "https://www.traviscad.org/ifile-login/" },
        { action: "waitFor", selector: "input[name='account_number']", timeoutMs: 10000 },
        { action: "fill", selector: "input[name='account_number']", from: "user.accountNumber" },
        { action: "fill", selector: "input[name='online_id']", from: "user.taxpayerPin" },
        { action: "click", selector: "button[type='submit']" },
        { action: "waitForURL", pattern: "/ifile/dashboard", timeoutMs: 15000 },
        { action: "click", selector: "a.start-protest, button#start-protest", optional: true },
        { action: "waitFor", selector: "form.protest-form", timeoutMs: 15000 },
        { action: "setRadio", selector: "input[name='basis']", value: "market_value" },
        { action: "fill", selector: "input[name='opinion_of_value']", from: "analysis.marketValueEstimate" },
        { action: "fill", selector: "textarea[name='narrative']", from: "analysis.executiveSummary" as any, optional: true },
        { action: "uploadFile", selector: "input[type='file'][name='evidence']", from: "report.pdfPath", optional: true },
        { action: "click", selector: "button#submit-protest" },
        { action: "waitFor", selector: ".confirmation-box", timeoutMs: 30000 },
        { action: "captureText", selector: ".confirmation-number", to: "result.confirmationNumber" },
        { action: "screenshot", to: "result.finalScreenshot", fullPage: true },
      ],
    },
  },
  {
    countyCode: "48201",
    countyName: "Harris County",
    state: "TX",
    portalUrl: "https://www.hcad.org/",
    validFrom: "2026-03-01",
    validUntil: "2026-05-15",
    notes:
      "HCAD iFile protest. Requires HCAD account + iFile number (printed on the appraisal notice).",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.hcad.org/ifile/",
      steps: [
        { action: "goto", url: "https://www.hcad.org/ifile/" },
        { action: "waitFor", selector: "#iFileNumber", timeoutMs: 10000 },
        { action: "fill", selector: "#iFileNumber", from: "user.taxpayerPin" },
        { action: "fill", selector: "#accountNumber", from: "user.accountNumber" },
        { action: "click", selector: "#submitLogin" },
        { action: "waitForURL", pattern: "ifile/protest", timeoutMs: 15000 },
        { action: "setRadio", selector: "input[name='protestReason']", value: "value" },
        { action: "fill", selector: "input[name='ownerValue']", from: "analysis.marketValueEstimate" },
        { action: "uploadFile", selector: "input[type='file']#evidenceUpload", from: "report.pdfPath", optional: true },
        { action: "click", selector: "button#submitProtest" },
        { action: "waitFor", selector: ".confirmation", timeoutMs: 30000 },
        { action: "captureText", selector: ".confirmation-id", to: "result.confirmationNumber" },
        { action: "screenshot", to: "result.finalScreenshot", fullPage: true },
      ],
    },
  },
  {
    countyCode: "12086",
    countyName: "Miami-Dade County",
    state: "FL",
    portalUrl: "https://www.miamidade.gov/Apps/PA/VABApp/",
    validFrom: "2026-08-15",
    validUntil: "2026-09-18",
    notes:
      "Miami-Dade Value Adjustment Board petition (DR-486). Requires Folio number and homestead status. Filing window is ~25 days after TRIM notice mailing.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.miamidade.gov/Apps/PA/VABApp/petition",
      steps: [
        { action: "goto", url: "https://www.miamidade.gov/Apps/PA/VABApp/petition" },
        { action: "waitFor", selector: "input#folio", timeoutMs: 10000 },
        { action: "fill", selector: "input#folio", from: "user.accountNumber" },
        { action: "fill", selector: "input#ownerName", from: "user.ownerName", optional: true },
        { action: "fill", selector: "input#email", from: "user.ownerEmail" },
        { action: "setCheckbox", selector: "input#agree", checked: true },
        { action: "click", selector: "button#continue" },
        { action: "waitFor", selector: "input#opinionOfValue", timeoutMs: 15000 },
        { action: "fill", selector: "input#opinionOfValue", from: "analysis.marketValueEstimate" },
        { action: "selectOption", selector: "select#reason", value: "ASSESSMENT_EXCEEDS_MARKET" },
        { action: "uploadFile", selector: "input#supportingDoc", from: "report.pdfPath", optional: true },
        { action: "click", selector: "button#submitPetition" },
        { action: "waitFor", selector: ".receipt", timeoutMs: 30000 },
        { action: "captureText", selector: ".receipt-number", to: "result.confirmationNumber" },
        { action: "screenshot", to: "result.finalScreenshot", fullPage: true },
      ],
    },
  },
];
