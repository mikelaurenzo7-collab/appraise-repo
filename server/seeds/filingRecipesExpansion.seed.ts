/**
 * Filing Recipes Expansion — Phase 2
 *
 * Draft recipes for all 65 counties added in countySeedExpansion.ts.
 * Status: "draft" — must be verified with Playwright Inspector before
 * promoting to "staging" or "verified".
 *
 * Recipe patterns by state:
 *   TX (iFile counties): account_number + online_id PIN → ARB protest form
 *   FL (VAB counties): folio + DR-486 petition form
 *   CA (AAB counties): APN + assessment appeal application
 *   NY (ARC/BOR counties): parcel ID + appeal form
 *   IL/OH/WA/GA/CO/MN/MI/NC/VA/MD/TN/NV/OR/UT/PA/AZ/SC/IN/KS: state-specific BOR forms
 */

import type { RecipeSeed } from "./filingRecipes.seed";

// ─── SHARED STEP BUILDERS ────────────────────────────────────────────────────

/** Standard TX iFile protest steps (used by all TX CAD portals) */
function txIFileSteps(portalUrl: string) {
  return [
    { action: "goto" as const, url: portalUrl },
    { action: "waitFor" as const, selector: "input[name='account_number'], input#account_number, input[id*='account']", timeoutMs: 10000 },
    { action: "fill" as const, selector: "input[name='account_number'], input#account_number, input[id*='account']", from: "user.accountNumber" as any },
    { action: "fill" as const, selector: "input[name='online_id'], input#online_id, input[id*='pin'], input[name='pin']", from: "user.taxpayerPin" as any },
    { action: "click" as const, selector: "button[type='submit'], input[type='submit']" },
    { action: "waitForURL" as const, pattern: "ifile|protest|dashboard", timeoutMs: 15000 },
    { action: "setRadio" as const, selector: "input[name='basis'], input[name='protestReason'], input[value='market_value'], input[value='value']", value: "market_value" },
    { action: "fill" as const, selector: "input[name='opinion_of_value'], input[name='ownerValue'], input[id*='opinion'], input[id*='value']", from: "analysis.marketValueEstimate" as any },
    { action: "fill" as const, selector: "textarea[name='narrative'], textarea[name='comments'], textarea[id*='narrative']", from: "analysis.executiveSummary" as any, optional: true },
    { action: "uploadFile" as const, selector: "input[type='file'][name='evidence'], input[type='file']#evidenceUpload, input[type='file']", from: "report.pdfPath" as any, optional: true },
    { action: "click" as const, selector: "button#submit-protest, button#submitProtest, button[type='submit'].protest-submit" },
    { action: "waitFor" as const, selector: ".confirmation-box, .confirmation, #confirmation, .receipt", timeoutMs: 30000 },
    { action: "captureText" as const, selector: ".confirmation-number, .confirmation-id, #confirmationNumber, .receipt-number", to: "result.confirmationNumber" as any },
    { action: "screenshot" as const, to: "result.finalScreenshot" as any, fullPage: true },
  ];
}

/** Standard FL VAB DR-486 petition steps */
function flVabSteps(portalUrl: string) {
  return [
    { action: "goto" as const, url: portalUrl },
    { action: "waitFor" as const, selector: "input[name='folio'], input#folio, input[id*='parcel'], input[name='parcelId']", timeoutMs: 10000 },
    { action: "fill" as const, selector: "input[name='folio'], input#folio, input[id*='parcel'], input[name='parcelId']", from: "user.accountNumber" as any },
    { action: "fill" as const, selector: "input[name='ownerName'], input#ownerName, input[id*='owner']", from: "user.ownerName" as any, optional: true },
    { action: "fill" as const, selector: "input[name='email'], input#email, input[type='email']", from: "user.ownerEmail" as any },
    { action: "setCheckbox" as const, selector: "input#agree, input[name='agree'], input[type='checkbox'][id*='agree']", checked: true },
    { action: "click" as const, selector: "button#continue, button[type='submit'], input[type='submit']" },
    { action: "waitFor" as const, selector: "input[name='opinionOfValue'], input#opinionOfValue, input[id*='opinion']", timeoutMs: 15000 },
    { action: "fill" as const, selector: "input[name='opinionOfValue'], input#opinionOfValue, input[id*='opinion']", from: "analysis.marketValueEstimate" as any },
    { action: "selectOption" as const, selector: "select[name='reason'], select#reason, select[id*='reason']", value: "ASSESSMENT_EXCEEDS_MARKET" },
    { action: "uploadFile" as const, selector: "input[type='file'][name='supportingDoc'], input[type='file']#supportingDoc, input[type='file']", from: "report.pdfPath" as any, optional: true },
    { action: "click" as const, selector: "button#submitPetition, button[type='submit'].submit-petition, button[type='submit']" },
    { action: "waitFor" as const, selector: ".receipt, .confirmation, #receipt, .petition-receipt", timeoutMs: 30000 },
    { action: "captureText" as const, selector: ".receipt-number, .confirmation-number, #receiptNumber", to: "result.confirmationNumber" as any },
    { action: "screenshot" as const, to: "result.finalScreenshot" as any, fullPage: true },
  ];
}

/** Standard CA Assessment Appeals Board steps */
function caAabSteps(portalUrl: string) {
  return [
    { action: "goto" as const, url: portalUrl },
    { action: "waitFor" as const, selector: "input[name='apn'], input#apn, input[id*='parcel'], input[name='parcelNumber']", timeoutMs: 10000 },
    { action: "fill" as const, selector: "input[name='apn'], input#apn, input[id*='parcel'], input[name='parcelNumber']", from: "user.accountNumber" as any },
    { action: "fill" as const, selector: "input[name='ownerName'], input[id*='owner'], input[name='applicantName']", from: "user.ownerName" as any, optional: true },
    { action: "fill" as const, selector: "input[name='email'], input[type='email']", from: "user.ownerEmail" as any },
    { action: "fill" as const, selector: "input[name='opinionOfValue'], input[id*='opinion'], input[name='requestedValue']", from: "analysis.marketValueEstimate" as any },
    { action: "fill" as const, selector: "textarea[name='basis'], textarea[name='reason'], textarea[id*='reason']", from: "analysis.executiveSummary" as any, optional: true },
    { action: "uploadFile" as const, selector: "input[type='file']", from: "report.pdfPath" as any, optional: true },
    { action: "click" as const, selector: "button[type='submit'], input[type='submit']" },
    { action: "waitFor" as const, selector: ".confirmation, .receipt, #confirmation, .success-message", timeoutMs: 30000 },
    { action: "captureText" as const, selector: ".confirmation-number, .receipt-number, #confirmationNumber", to: "result.confirmationNumber" as any },
    { action: "screenshot" as const, to: "result.finalScreenshot" as any, fullPage: true },
  ];
}

/** Generic BOR/BOE/BAR steps for OH, WA, GA, CO, MN, MI, NC, VA, MD, TN, NV, OR, UT, PA, AZ, SC, IN, KS */
function genericBorSteps(portalUrl: string) {
  return [
    { action: "goto" as const, url: portalUrl },
    { action: "waitFor" as const, selector: "input[name='parcelId'], input#parcelId, input[id*='parcel'], input[name='accountNumber'], input[name='propertyId']", timeoutMs: 10000 },
    { action: "fill" as const, selector: "input[name='parcelId'], input#parcelId, input[id*='parcel'], input[name='accountNumber'], input[name='propertyId']", from: "user.accountNumber" as any },
    { action: "fill" as const, selector: "input[name='ownerName'], input[id*='owner'], input[name='petitionerName'], input[name='applicantName']", from: "user.ownerName" as any, optional: true },
    { action: "fill" as const, selector: "input[name='email'], input[type='email']", from: "user.ownerEmail" as any },
    { action: "fill" as const, selector: "input[name='opinionOfValue'], input[id*='opinion'], input[name='requestedValue'], input[name='marketValue']", from: "analysis.marketValueEstimate" as any },
    { action: "fill" as const, selector: "textarea[name='reason'], textarea[name='basis'], textarea[name='narrative'], textarea[id*='reason']", from: "analysis.executiveSummary" as any, optional: true },
    { action: "uploadFile" as const, selector: "input[type='file']", from: "report.pdfPath" as any, optional: true },
    { action: "click" as const, selector: "button[type='submit'], input[type='submit']" },
    { action: "waitFor" as const, selector: ".confirmation, .receipt, #confirmation, .success, .success-message", timeoutMs: 30000 },
    { action: "captureText" as const, selector: ".confirmation-number, .receipt-number, #confirmationNumber, .case-number", to: "result.confirmationNumber" as any },
    { action: "screenshot" as const, to: "result.finalScreenshot" as any, fullPage: true },
  ];
}

// ─── RECIPE SEEDS ─────────────────────────────────────────────────────────────

export const RECIPE_SEEDS_EXPANSION: RecipeSeed[] = [

  // ─── TEXAS (additional iFile counties) ──────────────────────────────────
  {
    countyCode: "48167",
    countyName: "Galveston County",
    state: "TX",
    portalUrl: "https://www.galvestoncad.org/ifile/",
    validFrom: "2026-04-01",
    validUntil: "2026-05-15",
    notes: "GCAD iFile. Requires account number + online ID PIN from appraisal notice.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.galvestoncad.org/ifile/",
      steps: txIFileSteps("https://www.galvestoncad.org/ifile/"),
    },
  },
  {
    countyCode: "48039",
    countyName: "Brazoria County",
    state: "TX",
    portalUrl: "https://www.brazoriacad.org/protest-online.html",
    validFrom: "2026-04-01",
    validUntil: "2026-05-15",
    notes: "BCAD online protest. Requires account number + online PIN.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.brazoriacad.org/protest-online.html",
      steps: txIFileSteps("https://www.brazoriacad.org/protest-online.html"),
    },
  },
  {
    countyCode: "48355",
    countyName: "Nueces County",
    state: "TX",
    portalUrl: "https://www.nuecescad.net/ifile",
    validFrom: "2026-04-01",
    validUntil: "2026-05-15",
    notes: "NCAD iFile. Requires account number + online ID PIN.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.nuecescad.net/ifile",
      steps: txIFileSteps("https://www.nuecescad.net/ifile"),
    },
  },
  {
    countyCode: "48303",
    countyName: "Lubbock County",
    state: "TX",
    portalUrl: "https://www.lubbockcad.org/ifile",
    validFrom: "2026-04-01",
    validUntil: "2026-05-15",
    notes: "LCAD iFile. Requires account number + online ID PIN.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.lubbockcad.org/ifile",
      steps: txIFileSteps("https://www.lubbockcad.org/ifile"),
    },
  },
  {
    countyCode: "48245",
    countyName: "Jefferson County",
    state: "TX",
    portalUrl: "https://www.jcad.org/ifile",
    validFrom: "2026-04-01",
    validUntil: "2026-05-15",
    notes: "JCAD iFile. Requires account number + online ID PIN.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.jcad.org/ifile",
      steps: txIFileSteps("https://www.jcad.org/ifile"),
    },
  },
  {
    countyCode: "48423",
    countyName: "Smith County",
    state: "TX",
    portalUrl: "https://www.smithcad.org/ifile",
    validFrom: "2026-04-01",
    validUntil: "2026-05-15",
    notes: "SCAD iFile. Requires account number + online ID PIN.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.smithcad.org/ifile",
      steps: txIFileSteps("https://www.smithcad.org/ifile"),
    },
  },
  {
    countyCode: "48309",
    countyName: "McLennan County",
    state: "TX",
    portalUrl: "https://www.mclennancad.org/ifile",
    validFrom: "2026-04-01",
    validUntil: "2026-05-15",
    notes: "MCAD iFile. Requires account number + online ID PIN.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.mclennancad.org/ifile",
      steps: txIFileSteps("https://www.mclennancad.org/ifile"),
    },
  },

  // ─── FLORIDA (additional VAB counties) ──────────────────────────────────
  {
    countyCode: "12115",
    countyName: "Sarasota County",
    state: "FL",
    portalUrl: "https://www.sarasotaclerk.com/vab",
    validFrom: "2026-08-15",
    validUntil: "2026-09-18",
    notes: "Sarasota VAB DR-486 petition. Requires folio number and email.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.sarasotaclerk.com/vab",
      steps: flVabSteps("https://www.sarasotaclerk.com/vab"),
    },
  },
  {
    countyCode: "12127",
    countyName: "Volusia County",
    state: "FL",
    portalUrl: "https://www.volusiavab.com/",
    validFrom: "2026-08-15",
    validUntil: "2026-09-18",
    notes: "Volusia VAB DR-486 petition. Requires folio number and email.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.volusiavab.com/",
      steps: flVabSteps("https://www.volusiavab.com/"),
    },
  },
  {
    countyCode: "12101",
    countyName: "Pasco County",
    state: "FL",
    portalUrl: "https://www.pascoclerk.com/vab",
    validFrom: "2026-08-15",
    validUntil: "2026-09-18",
    notes: "Pasco VAB DR-486 petition. Requires folio number and email.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.pascoclerk.com/vab",
      steps: flVabSteps("https://www.pascoclerk.com/vab"),
    },
  },
  {
    countyCode: "12117",
    countyName: "Seminole County",
    state: "FL",
    portalUrl: "https://www.seminoleclerk.org/vab",
    validFrom: "2026-08-15",
    validUntil: "2026-09-18",
    notes: "Seminole VAB DR-486 petition. Requires folio number and email.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.seminoleclerk.org/vab",
      steps: flVabSteps("https://www.seminoleclerk.org/vab"),
    },
  },
  {
    countyCode: "12021",
    countyName: "Collier County",
    state: "FL",
    portalUrl: "https://www.collierclerk.com/vab",
    validFrom: "2026-08-15",
    validUntil: "2026-09-18",
    notes: "Collier VAB DR-486 petition. Requires folio number and email.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.collierclerk.com/vab",
      steps: flVabSteps("https://www.collierclerk.com/vab"),
    },
  },
  {
    countyCode: "12083",
    countyName: "Marion County",
    state: "FL",
    portalUrl: "https://www.marioncountyclerk.org/vab",
    validFrom: "2026-08-15",
    validUntil: "2026-09-18",
    notes: "Marion VAB DR-486 petition. Requires folio number and email.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.marioncountyclerk.org/vab",
      steps: flVabSteps("https://www.marioncountyclerk.org/vab"),
    },
  },

  // ─── CALIFORNIA ──────────────────────────────────────────────────────────
  {
    countyCode: "06037",
    countyName: "Los Angeles County",
    state: "CA",
    portalUrl: "https://assessoronline.lacounty.gov/",
    validFrom: "2026-07-02",
    validUntil: "2026-11-30",
    notes: "LA County AAB online application. Requires APN and owner info. Filing window Jul 2 – Nov 30 for regular roll.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://assessoronline.lacounty.gov/",
      steps: caAabSteps("https://assessoronline.lacounty.gov/"),
    },
  },
  {
    countyCode: "06073",
    countyName: "San Diego County",
    state: "CA",
    portalUrl: "https://www.sdcounty.ca.gov/assessor/appeal",
    validFrom: "2026-07-02",
    validUntil: "2026-11-30",
    notes: "San Diego AAB online application. Requires APN. Filing window Jul 2 – Nov 30.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.sdcounty.ca.gov/assessor/appeal",
      steps: caAabSteps("https://www.sdcounty.ca.gov/assessor/appeal"),
    },
  },
  {
    countyCode: "06059",
    countyName: "Orange County",
    state: "CA",
    portalUrl: "https://www.ocassessor.gov/appeal",
    validFrom: "2026-07-02",
    validUntil: "2026-11-30",
    notes: "Orange County AAB online application. Requires APN. Filing window Jul 2 – Nov 30.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.ocassessor.gov/appeal",
      steps: caAabSteps("https://www.ocassessor.gov/appeal"),
    },
  },
  {
    countyCode: "06065",
    countyName: "Riverside County",
    state: "CA",
    portalUrl: "https://www.assessor.co.riverside.ca.us/appeal",
    validFrom: "2026-07-02",
    validUntil: "2026-11-30",
    notes: "Riverside County AAB online application. Requires APN. Filing window Jul 2 – Nov 30.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.assessor.co.riverside.ca.us/appeal",
      steps: caAabSteps("https://www.assessor.co.riverside.ca.us/appeal"),
    },
  },
  {
    countyCode: "06071",
    countyName: "San Bernardino County",
    state: "CA",
    portalUrl: "https://www.sbcounty.gov/assessor/appeal",
    validFrom: "2026-07-02",
    validUntil: "2026-11-30",
    notes: "San Bernardino AAB online application. Requires APN. Filing window Jul 2 – Nov 30.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.sbcounty.gov/assessor/appeal",
      steps: caAabSteps("https://www.sbcounty.gov/assessor/appeal"),
    },
  },
  {
    countyCode: "06001",
    countyName: "Alameda County",
    state: "CA",
    portalUrl: "https://www.acgov.org/assessor/appeal",
    validFrom: "2026-07-02",
    validUntil: "2026-09-15",
    notes: "Alameda County AAB online application. Requires APN. Filing window Jul 2 – Sep 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.acgov.org/assessor/appeal",
      steps: caAabSteps("https://www.acgov.org/assessor/appeal"),
    },
  },
  {
    countyCode: "06085",
    countyName: "Santa Clara County",
    state: "CA",
    portalUrl: "https://www.sccassessor.org/appeal",
    validFrom: "2026-07-02",
    validUntil: "2026-09-15",
    notes: "Santa Clara County AAB online application. Requires APN. Filing window Jul 2 – Sep 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.sccassessor.org/appeal",
      steps: caAabSteps("https://www.sccassessor.org/appeal"),
    },
  },

  // ─── NEW YORK ─────────────────────────────────────────────────────────────
  {
    countyCode: "36059",
    countyName: "Nassau County",
    state: "NY",
    portalUrl: "https://www.nassaucountyny.gov/agencies/assessor/appeal",
    validFrom: "2026-01-02",
    validUntil: "2026-03-01",
    notes: "Nassau County ARC online filing. Requires parcel ID. Filing window Jan 2 – Mar 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.nassaucountyny.gov/agencies/assessor/appeal",
      steps: genericBorSteps("https://www.nassaucountyny.gov/agencies/assessor/appeal"),
    },
  },
  {
    countyCode: "36103",
    countyName: "Suffolk County",
    state: "NY",
    portalUrl: "https://www.suffolkcountyny.gov/Departments/CountyClerk/Assessment-Review",
    validFrom: "2026-05-01",
    validUntil: "2026-06-01",
    notes: "Suffolk County ARC online filing. Requires parcel ID. Filing window May 1 – Jun 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.suffolkcountyny.gov/Departments/CountyClerk/Assessment-Review",
      steps: genericBorSteps("https://www.suffolkcountyny.gov/Departments/CountyClerk/Assessment-Review"),
    },
  },
  {
    countyCode: "36119",
    countyName: "Westchester County",
    state: "NY",
    portalUrl: "https://tax.westchestergov.com/",
    validFrom: "2026-05-01",
    validUntil: "2026-06-01",
    notes: "Westchester County SCAR online filing. Requires parcel ID. Filing window May 1 – Jun 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://tax.westchestergov.com/",
      steps: genericBorSteps("https://tax.westchestergov.com/"),
    },
  },

  // ─── ILLINOIS ─────────────────────────────────────────────────────────────
  {
    countyCode: "17089",
    countyName: "Kane County",
    state: "IL",
    portalUrl: "https://www.kanecountyassessor.com/appeal",
    validFrom: "2026-06-01",
    validUntil: "2026-07-31",
    notes: "Kane County BOR online appeal. Requires parcel ID. Filing window Jun 1 – Jul 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.kanecountyassessor.com/appeal",
      steps: genericBorSteps("https://www.kanecountyassessor.com/appeal"),
    },
  },
  {
    countyCode: "17111",
    countyName: "McHenry County",
    state: "IL",
    portalUrl: "https://www.mchenrycountyil.gov/county-government/departments-j-z/supervisor-of-assessments/board-of-review",
    validFrom: "2026-06-01",
    validUntil: "2026-07-31",
    notes: "McHenry County BOR online appeal. Requires parcel ID. Filing window Jun 1 – Jul 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.mchenrycountyil.gov/county-government/departments-j-z/supervisor-of-assessments/board-of-review",
      steps: genericBorSteps("https://www.mchenrycountyil.gov/county-government/departments-j-z/supervisor-of-assessments/board-of-review"),
    },
  },

  // ─── OHIO ─────────────────────────────────────────────────────────────────
  {
    countyCode: "39061",
    countyName: "Hamilton County",
    state: "OH",
    portalUrl: "https://www.hamiltoncountyauditor.org/BOR",
    validFrom: "2026-01-01",
    validUntil: "2026-03-31",
    notes: "Hamilton County BOR online complaint. Requires parcel ID. Filing window Jan 1 – Mar 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.hamiltoncountyauditor.org/BOR",
      steps: genericBorSteps("https://www.hamiltoncountyauditor.org/BOR"),
    },
  },
  {
    countyCode: "39113",
    countyName: "Montgomery County",
    state: "OH",
    portalUrl: "https://www.mcohio.org/government/elected_officials/auditor/board_of_revision.php",
    validFrom: "2026-01-01",
    validUntil: "2026-03-31",
    notes: "Montgomery County BOR online complaint. Requires parcel ID. Filing window Jan 1 – Mar 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.mcohio.org/government/elected_officials/auditor/board_of_revision.php",
      steps: genericBorSteps("https://www.mcohio.org/government/elected_officials/auditor/board_of_revision.php"),
    },
  },
  {
    countyCode: "39095",
    countyName: "Lucas County",
    state: "OH",
    portalUrl: "https://www.co.lucas.oh.us/index.aspx?NID=2079",
    validFrom: "2026-01-01",
    validUntil: "2026-03-31",
    notes: "Lucas County BOR online complaint. Requires parcel ID. Filing window Jan 1 – Mar 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.co.lucas.oh.us/index.aspx?NID=2079",
      steps: genericBorSteps("https://www.co.lucas.oh.us/index.aspx?NID=2079"),
    },
  },

  // ─── WASHINGTON ───────────────────────────────────────────────────────────
  {
    countyCode: "53011",
    countyName: "Clark County",
    state: "WA",
    portalUrl: "https://www.clark.wa.gov/assessor/appeal",
    validFrom: "2026-07-01",
    validUntil: "2026-07-31",
    notes: "Clark County BOE online appeal. Requires parcel ID. Filing window Jul 1 – Jul 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.clark.wa.gov/assessor/appeal",
      steps: genericBorSteps("https://www.clark.wa.gov/assessor/appeal"),
    },
  },
  {
    countyCode: "53063",
    countyName: "Spokane County",
    state: "WA",
    portalUrl: "https://www.spokanecounty.org/1101/Board-of-Equalization",
    validFrom: "2026-07-01",
    validUntil: "2026-07-31",
    notes: "Spokane County BOE online appeal. Requires parcel ID. Filing window Jul 1 – Jul 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.spokanecounty.org/1101/Board-of-Equalization",
      steps: genericBorSteps("https://www.spokanecounty.org/1101/Board-of-Equalization"),
    },
  },

  // ─── GEORGIA ──────────────────────────────────────────────────────────────
  {
    countyCode: "13057",
    countyName: "Cherokee County",
    state: "GA",
    portalUrl: "https://www.cherokeega.com/departments/tax-assessors/appeal",
    validFrom: "2026-04-01",
    validUntil: "2026-05-31",
    notes: "Cherokee County BTA online appeal. Requires parcel ID. Filing window Apr 1 – May 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.cherokeega.com/departments/tax-assessors/appeal",
      steps: genericBorSteps("https://www.cherokeega.com/departments/tax-assessors/appeal"),
    },
  },
  {
    countyCode: "13151",
    countyName: "Henry County",
    state: "GA",
    portalUrl: "https://www.co.henry.ga.us/departments/tax-assessors/appeal",
    validFrom: "2026-04-01",
    validUntil: "2026-05-31",
    notes: "Henry County BTA online appeal. Requires parcel ID. Filing window Apr 1 – May 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.co.henry.ga.us/departments/tax-assessors/appeal",
      steps: genericBorSteps("https://www.co.henry.ga.us/departments/tax-assessors/appeal"),
    },
  },

  // ─── COLORADO ─────────────────────────────────────────────────────────────
  {
    countyCode: "08001",
    countyName: "Adams County",
    state: "CO",
    portalUrl: "https://www.adcogov.org/assessor/appeal",
    validFrom: "2026-05-01",
    validUntil: "2026-06-01",
    notes: "Adams County BOE online appeal. Requires parcel ID. Filing window May 1 – Jun 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.adcogov.org/assessor/appeal",
      steps: genericBorSteps("https://www.adcogov.org/assessor/appeal"),
    },
  },
  {
    countyCode: "08013",
    countyName: "Boulder County",
    state: "CO",
    portalUrl: "https://www.bouldercounty.org/property-and-land/assessor/appeal",
    validFrom: "2026-05-01",
    validUntil: "2026-06-01",
    notes: "Boulder County BOE online appeal. Requires parcel ID. Filing window May 1 – Jun 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.bouldercounty.org/property-and-land/assessor/appeal",
      steps: genericBorSteps("https://www.bouldercounty.org/property-and-land/assessor/appeal"),
    },
  },
  {
    countyCode: "08069",
    countyName: "Larimer County",
    state: "CO",
    portalUrl: "https://www.larimer.gov/assessor/appeal",
    validFrom: "2026-05-01",
    validUntil: "2026-06-01",
    notes: "Larimer County BOE online appeal. Requires parcel ID. Filing window May 1 – Jun 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.larimer.gov/assessor/appeal",
      steps: genericBorSteps("https://www.larimer.gov/assessor/appeal"),
    },
  },

  // ─── MINNESOTA ────────────────────────────────────────────────────────────
  {
    countyCode: "27003",
    countyName: "Anoka County",
    state: "MN",
    portalUrl: "https://www.anokacounty.us/assessor/appeal",
    validFrom: "2026-04-01",
    validUntil: "2026-04-30",
    notes: "Anoka County BOAE online appeal. Requires parcel ID. Filing window Apr 1 – Apr 30.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.anokacounty.us/assessor/appeal",
      steps: genericBorSteps("https://www.anokacounty.us/assessor/appeal"),
    },
  },
  {
    countyCode: "27163",
    countyName: "Washington County",
    state: "MN",
    portalUrl: "https://www.co.washington.mn.us/assessor/appeal",
    validFrom: "2026-04-01",
    validUntil: "2026-04-30",
    notes: "Washington County MN BOAE online appeal. Requires parcel ID. Filing window Apr 1 – Apr 30.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.co.washington.mn.us/assessor/appeal",
      steps: genericBorSteps("https://www.co.washington.mn.us/assessor/appeal"),
    },
  },

  // ─── MICHIGAN ─────────────────────────────────────────────────────────────
  {
    countyCode: "26081",
    countyName: "Kent County",
    state: "MI",
    portalUrl: "https://www.accesskent.com/Departments/Equalization/appeal.htm",
    validFrom: "2026-02-01",
    validUntil: "2026-03-31",
    notes: "Kent County BOR online appeal. Requires parcel ID. Filing window Feb 1 – Mar 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.accesskent.com/Departments/Equalization/appeal.htm",
      steps: genericBorSteps("https://www.accesskent.com/Departments/Equalization/appeal.htm"),
    },
  },
  {
    countyCode: "26161",
    countyName: "Washtenaw County",
    state: "MI",
    portalUrl: "https://www.washtenaw.org/government/departments/equalization/appeal",
    validFrom: "2026-02-01",
    validUntil: "2026-03-31",
    notes: "Washtenaw County BOR online appeal. Requires parcel ID. Filing window Feb 1 – Mar 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.washtenaw.org/government/departments/equalization/appeal",
      steps: genericBorSteps("https://www.washtenaw.org/government/departments/equalization/appeal"),
    },
  },

  // ─── NORTH CAROLINA ───────────────────────────────────────────────────────
  {
    countyCode: "37067",
    countyName: "Forsyth County",
    state: "NC",
    portalUrl: "https://www.forsyth.cc/tax/appeal.aspx",
    validFrom: "2026-04-01",
    validUntil: "2026-05-15",
    notes: "Forsyth County BER online appeal. Requires parcel ID. Filing window Apr 1 – May 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.forsyth.cc/tax/appeal.aspx",
      steps: genericBorSteps("https://www.forsyth.cc/tax/appeal.aspx"),
    },
  },
  {
    countyCode: "37063",
    countyName: "Durham County",
    state: "NC",
    portalUrl: "https://www.dconc.gov/government/departments-f-z/tax-administration/appeal",
    validFrom: "2026-04-01",
    validUntil: "2026-05-15",
    notes: "Durham County BER online appeal. Requires parcel ID. Filing window Apr 1 – May 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.dconc.gov/government/departments-f-z/tax-administration/appeal",
      steps: genericBorSteps("https://www.dconc.gov/government/departments-f-z/tax-administration/appeal"),
    },
  },

  // ─── VIRGINIA ─────────────────────────────────────────────────────────────
  {
    countyCode: "51107",
    countyName: "Loudoun County",
    state: "VA",
    portalUrl: "https://www.loudoun.gov/assessor/appeal",
    validFrom: "2026-02-01",
    validUntil: "2026-04-01",
    notes: "Loudoun County BOE online appeal. Requires parcel ID. Filing window Feb 1 – Apr 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.loudoun.gov/assessor/appeal",
      steps: genericBorSteps("https://www.loudoun.gov/assessor/appeal"),
    },
  },
  {
    countyCode: "51041",
    countyName: "Chesterfield County",
    state: "VA",
    portalUrl: "https://www.chesterfield.gov/assessor/appeal",
    validFrom: "2026-02-01",
    validUntil: "2026-04-01",
    notes: "Chesterfield County BOE online appeal. Requires parcel ID. Filing window Feb 1 – Apr 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.chesterfield.gov/assessor/appeal",
      steps: genericBorSteps("https://www.chesterfield.gov/assessor/appeal"),
    },
  },

  // ─── MARYLAND ─────────────────────────────────────────────────────────────
  {
    countyCode: "24003",
    countyName: "Anne Arundel County",
    state: "MD",
    portalUrl: "https://sdat.dat.maryland.gov/RealProperty/Pages/default.aspx",
    validFrom: "2026-01-01",
    validUntil: "2026-02-01",
    notes: "Maryland SDAT online appeal. Requires parcel ID. Filing window Jan 1 – Feb 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://sdat.dat.maryland.gov/RealProperty/Pages/default.aspx",
      steps: genericBorSteps("https://sdat.dat.maryland.gov/RealProperty/Pages/default.aspx"),
    },
  },
  {
    countyCode: "24027",
    countyName: "Howard County",
    state: "MD",
    portalUrl: "https://sdat.dat.maryland.gov/RealProperty/Pages/default.aspx",
    validFrom: "2026-01-01",
    validUntil: "2026-02-01",
    notes: "Maryland SDAT online appeal (Howard). Requires parcel ID. Filing window Jan 1 – Feb 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://sdat.dat.maryland.gov/RealProperty/Pages/default.aspx",
      steps: genericBorSteps("https://sdat.dat.maryland.gov/RealProperty/Pages/default.aspx"),
    },
  },

  // ─── TENNESSEE ────────────────────────────────────────────────────────────
  {
    countyCode: "47157",
    countyName: "Shelby County",
    state: "TN",
    portalUrl: "https://www.assessormelissa.com/appeal",
    validFrom: "2026-05-01",
    validUntil: "2026-06-01",
    notes: "Shelby County BOE online appeal. Requires parcel ID. Filing window May 1 – Jun 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.assessormelissa.com/appeal",
      steps: genericBorSteps("https://www.assessormelissa.com/appeal"),
    },
  },
  {
    countyCode: "47037",
    countyName: "Davidson County",
    state: "TN",
    portalUrl: "https://www.padctn.org/appeal",
    validFrom: "2026-05-01",
    validUntil: "2026-06-01",
    notes: "Davidson County BOE online appeal. Requires parcel ID. Filing window May 1 – Jun 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.padctn.org/appeal",
      steps: genericBorSteps("https://www.padctn.org/appeal"),
    },
  },
  {
    countyCode: "47093",
    countyName: "Knox County",
    state: "TN",
    portalUrl: "https://www.knoxcounty.org/assessor/appeal",
    validFrom: "2026-05-01",
    validUntil: "2026-06-01",
    notes: "Knox County BOE online appeal. Requires parcel ID. Filing window May 1 – Jun 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.knoxcounty.org/assessor/appeal",
      steps: genericBorSteps("https://www.knoxcounty.org/assessor/appeal"),
    },
  },

  // ─── NEVADA ───────────────────────────────────────────────────────────────
  {
    countyCode: "32003",
    countyName: "Clark County",
    state: "NV",
    portalUrl: "https://www.clarkcountynv.gov/government/departments/assessor/appeal",
    validFrom: "2026-01-01",
    validUntil: "2026-01-15",
    notes: "Clark County NV BOE online appeal. Requires parcel ID. Filing window Jan 1 – Jan 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.clarkcountynv.gov/government/departments/assessor/appeal",
      steps: genericBorSteps("https://www.clarkcountynv.gov/government/departments/assessor/appeal"),
    },
  },
  {
    countyCode: "32031",
    countyName: "Washoe County",
    state: "NV",
    portalUrl: "https://www.washoecounty.gov/assessor/appeal",
    validFrom: "2026-01-01",
    validUntil: "2026-01-15",
    notes: "Washoe County BOE online appeal. Requires parcel ID. Filing window Jan 1 – Jan 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.washoecounty.gov/assessor/appeal",
      steps: genericBorSteps("https://www.washoecounty.gov/assessor/appeal"),
    },
  },

  // ─── OREGON ───────────────────────────────────────────────────────────────
  {
    countyCode: "41051",
    countyName: "Multnomah County",
    state: "OR",
    portalUrl: "https://www.multco.us/assessment-taxation/appeal",
    validFrom: "2026-10-01",
    validUntil: "2026-12-31",
    notes: "Multnomah County BOPTA online appeal. Requires parcel ID. Filing window Oct 1 – Dec 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.multco.us/assessment-taxation/appeal",
      steps: genericBorSteps("https://www.multco.us/assessment-taxation/appeal"),
    },
  },
  {
    countyCode: "41067",
    countyName: "Washington County",
    state: "OR",
    portalUrl: "https://www.co.washington.or.us/AssessmentTaxation/appeal",
    validFrom: "2026-10-01",
    validUntil: "2026-12-31",
    notes: "Washington County OR BOPTA online appeal. Requires parcel ID. Filing window Oct 1 – Dec 31.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.co.washington.or.us/AssessmentTaxation/appeal",
      steps: genericBorSteps("https://www.co.washington.or.us/AssessmentTaxation/appeal"),
    },
  },

  // ─── UTAH ─────────────────────────────────────────────────────────────────
  {
    countyCode: "49035",
    countyName: "Salt Lake County",
    state: "UT",
    portalUrl: "https://slco.org/assessor/appeal",
    validFrom: "2026-05-01",
    validUntil: "2026-09-15",
    notes: "Salt Lake County BOE online appeal. Requires parcel ID. Filing window May 1 – Sep 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://slco.org/assessor/appeal",
      steps: genericBorSteps("https://slco.org/assessor/appeal"),
    },
  },
  {
    countyCode: "49049",
    countyName: "Utah County",
    state: "UT",
    portalUrl: "https://www.utahcounty.gov/Dept/Assessor/appeal",
    validFrom: "2026-05-01",
    validUntil: "2026-09-15",
    notes: "Utah County BOE online appeal. Requires parcel ID. Filing window May 1 – Sep 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.utahcounty.gov/Dept/Assessor/appeal",
      steps: genericBorSteps("https://www.utahcounty.gov/Dept/Assessor/appeal"),
    },
  },

  // ─── PENNSYLVANIA ─────────────────────────────────────────────────────────
  {
    countyCode: "42029",
    countyName: "Chester County",
    state: "PA",
    portalUrl: "https://www.chesco.org/assessments/appeal",
    validFrom: "2026-08-01",
    validUntil: "2026-09-01",
    notes: "Chester County BAA online appeal. Requires parcel ID. Filing window Aug 1 – Sep 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.chesco.org/assessments/appeal",
      steps: genericBorSteps("https://www.chesco.org/assessments/appeal"),
    },
  },
  {
    countyCode: "42045",
    countyName: "Delaware County",
    state: "PA",
    portalUrl: "https://www.co.delaware.pa.us/assessments/appeal",
    validFrom: "2026-08-01",
    validUntil: "2026-09-01",
    notes: "Delaware County PA BAA online appeal. Requires parcel ID. Filing window Aug 1 – Sep 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.co.delaware.pa.us/assessments/appeal",
      steps: genericBorSteps("https://www.co.delaware.pa.us/assessments/appeal"),
    },
  },

  // ─── ARIZONA ──────────────────────────────────────────────────────────────
  {
    countyCode: "04021",
    countyName: "Pinal County",
    state: "AZ",
    portalUrl: "https://www.pinalcountyaz.gov/assessor/appeal",
    validFrom: "2026-11-01",
    validUntil: "2026-12-15",
    notes: "Pinal County BOE online appeal. Requires parcel ID. Filing window Nov 1 – Dec 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.pinalcountyaz.gov/assessor/appeal",
      steps: genericBorSteps("https://www.pinalcountyaz.gov/assessor/appeal"),
    },
  },
  {
    countyCode: "04025",
    countyName: "Yavapai County",
    state: "AZ",
    portalUrl: "https://www.yavapai.us/assessor/appeal",
    validFrom: "2026-11-01",
    validUntil: "2026-12-15",
    notes: "Yavapai County BOE online appeal. Requires parcel ID. Filing window Nov 1 – Dec 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.yavapai.us/assessor/appeal",
      steps: genericBorSteps("https://www.yavapai.us/assessor/appeal"),
    },
  },

  // ─── SOUTH CAROLINA ───────────────────────────────────────────────────────
  {
    countyCode: "45045",
    countyName: "Greenville County",
    state: "SC",
    portalUrl: "https://www.greenvillecounty.org/assessor/appeal",
    validFrom: "2026-07-01",
    validUntil: "2026-08-01",
    notes: "Greenville County BAA online appeal. Requires parcel ID. Filing window Jul 1 – Aug 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.greenvillecounty.org/assessor/appeal",
      steps: genericBorSteps("https://www.greenvillecounty.org/assessor/appeal"),
    },
  },
  {
    countyCode: "45079",
    countyName: "Richland County",
    state: "SC",
    portalUrl: "https://www.richlandcountysc.gov/Departments/Assessor/appeal",
    validFrom: "2026-07-01",
    validUntil: "2026-08-01",
    notes: "Richland County BAA online appeal. Requires parcel ID. Filing window Jul 1 – Aug 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.richlandcountysc.gov/Departments/Assessor/appeal",
      steps: genericBorSteps("https://www.richlandcountysc.gov/Departments/Assessor/appeal"),
    },
  },

  // ─── INDIANA ──────────────────────────────────────────────────────────────
  {
    countyCode: "18097",
    countyName: "Marion County",
    state: "IN",
    portalUrl: "https://www.indy.gov/activity/file-a-property-tax-appeal",
    validFrom: "2026-05-10",
    validUntil: "2026-06-15",
    notes: "Marion County IN PTABOA online appeal. Requires parcel ID. Filing window May 10 – Jun 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.indy.gov/activity/file-a-property-tax-appeal",
      steps: genericBorSteps("https://www.indy.gov/activity/file-a-property-tax-appeal"),
    },
  },
  {
    countyCode: "18057",
    countyName: "Hamilton County",
    state: "IN",
    portalUrl: "https://www.hamiltoncounty.in.gov/assessor/appeal",
    validFrom: "2026-05-10",
    validUntil: "2026-06-15",
    notes: "Hamilton County IN PTABOA online appeal. Requires parcel ID. Filing window May 10 – Jun 15.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.hamiltoncounty.in.gov/assessor/appeal",
      steps: genericBorSteps("https://www.hamiltoncounty.in.gov/assessor/appeal"),
    },
  },

  // ─── KANSAS ───────────────────────────────────────────────────────────────
  {
    countyCode: "20091",
    countyName: "Johnson County",
    state: "KS",
    portalUrl: "https://www.jocogov.org/dept/appraiser/appeal",
    validFrom: "2026-03-01",
    validUntil: "2026-04-01",
    notes: "Johnson County KS BOE online appeal. Requires parcel ID. Filing window Mar 1 – Apr 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.jocogov.org/dept/appraiser/appeal",
      steps: genericBorSteps("https://www.jocogov.org/dept/appraiser/appeal"),
    },
  },
  {
    countyCode: "20173",
    countyName: "Sedgwick County",
    state: "KS",
    portalUrl: "https://www.sedgwickcounty.org/appraiser/appeal",
    validFrom: "2026-03-01",
    validUntil: "2026-04-01",
    notes: "Sedgwick County KS BOE online appeal. Requires parcel ID. Filing window Mar 1 – Apr 1.",
    recipe: {
      countyId: 0,
      version: 1,
      portalUrl: "https://www.sedgwickcounty.org/appraiser/appeal",
      steps: genericBorSteps("https://www.sedgwickcounty.org/appraiser/appeal"),
    },
  },
];
