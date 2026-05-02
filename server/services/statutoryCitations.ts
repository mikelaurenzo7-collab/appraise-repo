/**
 * Statutory Citations for Property Tax Appeals
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps state code → primary statutory bases for the three grounds of relief
 * (excessive market value, lack of uniformity, errors of fact) so the
 * attorney-audience persuasion brief can include accurate cite anchors
 * instead of placeholder text.
 *
 * Coverage: states where the canonical citation is well-established and
 * widely used by practitioners. For other states, getStatutoryCitations
 * returns null and the brief states "consult local counsel for the
 * precise statutory citation in [STATE]" — never fabricates a cite.
 *
 * Citations below are common public legal references. Attorneys should
 * still verify the current section number against the latest published
 * code before filing; statutes are renumbered occasionally.
 */

export interface StatutoryCitations {
  /** State name for display. */
  state: string;
  /** Two-letter postal code. */
  stateCode: string;
  /**
   * Constitutional or statutory basis for excessive-market-value appeals
   * (the standard "the property is over-valued" ground).
   */
  marketValueGround: string;
  /**
   * Constitutional or statutory basis for lack-of-uniformity / equity
   * appeals (the property is assessed at a higher ratio than peers).
   */
  uniformityGround: string;
  /**
   * Statutory basis for errors-of-fact appeals (the assessor's record
   * of physical characteristics is wrong).
   */
  recordErrorGround: string;
  /** Filing form name / number, when widely standardized. */
  filingForm?: string;
  /**
   * Notes that will appear in the attorney brief — e.g. specific local
   * board names, hearing-format specifics, prerequisites.
   */
  practitionerNotes?: string;
}

const CITATIONS: Record<string, StatutoryCitations> = {
  // ─── TEXAS ─────────────────────────────────────────────────────────────────
  TX: {
    state: "Texas",
    stateCode: "TX",
    marketValueGround:
      "Tex. Const. Art. VIII §1(b) (taxation in proportion to market value); Tex. Tax Code §41.41(a)(1) (protest on grounds of excessive value).",
    uniformityGround:
      "Tex. Const. Art. VIII §1(a) (taxation must be equal and uniform); Tex. Tax Code §41.41(a)(2) (protest on unequal-appraisal grounds — median appraised value of a reasonable number of comparable properties, appropriately adjusted).",
    recordErrorGround:
      "Tex. Tax Code §25.25(c) (correction of clerical or substantial-error appraisal records); §41.411 (protest of failure to give notice).",
    filingForm: "Comptroller Form 50-132 (Notice of Protest)",
    practitionerNotes:
      "Appeal Review Board (ARB) hearing; hearing notice ≥15 days; protest deadline May 15 or 30 days after notice, whichever is later.",
  },

  // ─── CALIFORNIA ────────────────────────────────────────────────────────────
  CA: {
    state: "California",
    stateCode: "CA",
    marketValueGround:
      "Cal. Const. Art. XIII A §2 (Prop 13 base year + 2% inflation cap); Cal. Rev. & Tax. Code §§51, 110 (full cash value / fair market value standard for new construction or change in ownership).",
    uniformityGround:
      "Cal. Const. Art. XIII §1 (taxation in proportion to value); §3 (uniformity within a class). Equity appeals are constrained by Prop 13 — the primary uniformity argument is decline-in-value (Prop 8) under R&T §51(e).",
    recordErrorGround:
      "Cal. Rev. & Tax. Code §531 (escape assessments / errors); §51.5 (correction of errors on the assessment roll).",
    filingForm: "BOE-305-AH (Application for Changed Assessment)",
    practitionerNotes:
      "County Assessment Appeals Board; deadline typically Sep 15 or Nov 30 by county; two-year statutory hearing window (R&T §1604).",
  },

  // ─── ILLINOIS / COOK COUNTY ────────────────────────────────────────────────
  IL: {
    state: "Illinois",
    stateCode: "IL",
    marketValueGround:
      "35 ILCS 200/9-145 (assessment at 33⅓% of fair cash value statewide; 10% in Cook County under classification ordinance); 35 ILCS 200/16-55 (Board of Review revision authority on overvaluation).",
    uniformityGround:
      "Ill. Const. Art. IX §4(a) (uniformity of taxation within a class); 35 ILCS 200/16-55 (review on grounds of lack of uniformity); Cook County Board of Review Rules R7 (uniformity argument procedure).",
    recordErrorGround:
      "35 ILCS 200/14-15 (errors of fact correctable upon discovery); 35 ILCS 200/16-55 (BOR jurisdiction over factual errors).",
    filingForm:
      "Cook County: BOR Residential Assessment Appeal; PTAB Form PTAB-1 for state-level review.",
    practitionerNotes:
      "Cook County: Assessor's Office → Board of Review → Property Tax Appeal Board (PTAB) or Circuit Court. Triennial reassessment cycle by township.",
  },

  // ─── FLORIDA ───────────────────────────────────────────────────────────────
  FL: {
    state: "Florida",
    stateCode: "FL",
    marketValueGround:
      "Fla. Const. Art. VII §4 (just valuation standard); Fla. Stat. §193.011 (factors in determining just value); Fla. Stat. §194.301 (just-value challenge).",
    uniformityGround:
      "Fla. Const. Art. VII §2 (uniform rate within taxing units); Fla. Stat. §194.301 (proceeding on the basis of unequal assessment).",
    recordErrorGround:
      "Fla. Stat. §197.182 (error correction); §193.092 (assessment roll error).",
    filingForm: "DR-486 (Petition to the Value Adjustment Board)",
    practitionerNotes:
      "County Value Adjustment Board (VAB); petition due 25 days after TRIM notice mailing.",
  },

  // ─── NEW YORK ──────────────────────────────────────────────────────────────
  NY: {
    state: "New York",
    stateCode: "NY",
    marketValueGround:
      "N.Y. Real Prop. Tax Law (RPTL) §305 (value standard); §706 (judicial review of overvaluation under Article 7).",
    uniformityGround:
      "N.Y. Const. Art. XVI §2 (uniform rate within the assessing unit); RPTL §305(2); §706 (unequal-assessment challenge).",
    recordErrorGround:
      "RPTL §550–§556 (correction of errors); §554 (clerical and unlawful entries).",
    filingForm:
      "Form RP-524 (Complaint on Real Property Assessment); Form RPTL Article 7 Petition for SCAR / judicial review.",
    practitionerNotes:
      "Board of Assessment Review (BAR) hearing on Grievance Day (4th Tuesday in May for most jurisdictions); SCAR or Article 7 follow-up.",
  },

  // ─── GEORGIA ───────────────────────────────────────────────────────────────
  GA: {
    state: "Georgia",
    stateCode: "GA",
    marketValueGround:
      "O.C.G.A. §48-5-2 (fair market value standard); §48-5-311(e) (appeal on grounds of value).",
    uniformityGround:
      "Ga. Const. Art. VII §1 (uniform taxation); O.C.G.A. §48-5-311(e)(1) (appeal on grounds of uniformity / equity).",
    recordErrorGround:
      "O.C.G.A. §48-5-303 (correction of digest errors); §48-5-311(e) (appeal on grounds of taxability / exemption / value).",
    filingForm: "PT-311A (Appeal of Assessment)",
    practitionerNotes:
      "Board of Equalization → Hearing Officer (commercial) or Arbitration; 45-day appeal window from notice.",
  },

  // ─── MASSACHUSETTS ─────────────────────────────────────────────────────────
  MA: {
    state: "Massachusetts",
    stateCode: "MA",
    marketValueGround:
      "M.G.L. ch. 59 §38 (fair cash value standard); ch. 59 §59 (abatement application on grounds of overvaluation).",
    uniformityGround:
      "Mass. Const. Pt. 2, ch. 1 §1, art. IV (proportional and reasonable tax); ch. 59 §65 (Appellate Tax Board review on disproportionate assessment).",
    recordErrorGround:
      "M.G.L. ch. 59 §75–§77 (correction of assessment errors).",
    filingForm: "State Tax Form 128 (Application for Abatement of Real Estate Tax)",
    practitionerNotes:
      "Local Board of Assessors → Appellate Tax Board (ATB) or county commissioners; deadline typically by date of first installment due (varies by city).",
  },

  // ─── NEW JERSEY ────────────────────────────────────────────────────────────
  NJ: {
    state: "New Jersey",
    stateCode: "NJ",
    marketValueGround:
      "N.J.S.A. 54:4-1 (true value standard); 54:3-22 (county tax board appeal on overvaluation).",
    uniformityGround:
      "N.J. Const. Art. VIII §1 ¶1 (uniform rule of taxation); N.J.S.A. 54:51A-6 (Tax Court review under the common-level-ratio Chapter 123 ratio test).",
    recordErrorGround:
      "N.J.S.A. 54:4-43 (correction of clerical or factual errors in the assessment list).",
    filingForm: "Form A-1 (Petition of Appeal — County Tax Board); Form 10001 (Tax Court).",
    practitionerNotes:
      "County Board of Taxation → Tax Court of New Jersey; deadline April 1 (or May 1 in counties undergoing revaluation).",
  },

  // ─── OHIO ──────────────────────────────────────────────────────────────────
  OH: {
    state: "Ohio",
    stateCode: "OH",
    marketValueGround:
      "Ohio Rev. Code §5713.03 (true value in money standard); §5715.19(A) (complaint against valuation to county Board of Revision).",
    uniformityGround:
      "Ohio Const. Art. XII §2 (uniform tax rule); §5715.19 BOR jurisdiction encompasses uniformity challenges.",
    recordErrorGround:
      "Ohio Rev. Code §5713.20 (correction of records); §5715.19(A)(2)–(7) (BOR jurisdiction over factual errors in the assessment).",
    filingForm: "DTE 1 (Complaint Against the Valuation of Real Property)",
    practitionerNotes:
      "County Board of Revision (BOR) → Ohio Board of Tax Appeals (BTA) or Common Pleas Court; deadline March 31 of the year following the tax year.",
  },

  // ─── PENNSYLVANIA ──────────────────────────────────────────────────────────
  PA: {
    state: "Pennsylvania",
    stateCode: "PA",
    marketValueGround:
      "53 Pa.C.S. §8842 (assessment at predetermined ratio of actual value); county-specific appeal statutes (e.g., 72 P.S. §5347 second-class A counties).",
    uniformityGround:
      "Pa. Const. Art. VIII §1 (uniformity clause); Downingtown Area Sch. Dist. v. Chester Cnty. Bd. of Assessment Appeals (PA uniformity remedy via common-level-ratio).",
    recordErrorGround:
      "County assessment law (e.g., 53 Pa.C.S. §8853) authorizes revision for clerical / mathematical / factual errors in the assessment record.",
    filingForm: "Annual Appeal Form (county-specific; e.g., Allegheny County Board of Property Assessment Appeals & Review Form).",
    practitionerNotes:
      "County Board of Assessment Appeals → Court of Common Pleas; annual appeal deadline typically Aug 1 or Sep 1 by county; interim appeals available on assessment changes.",
  },

  // ─── MICHIGAN ──────────────────────────────────────────────────────────────
  MI: {
    state: "Michigan",
    stateCode: "MI",
    marketValueGround:
      "M.C.L. §211.27 (true cash value standard); §211.30 (Board of Review jurisdiction).",
    uniformityGround:
      "Mich. Const. Art. IX §3 (uniform rule of taxation; assessments at not more than 50% of true cash value); M.C.L. §205.737 (Tax Tribunal jurisdiction over uniformity).",
    recordErrorGround:
      "M.C.L. §211.53b (qualified-error correction); §211.154 (errors of fact).",
    filingForm: "MTT Form (Michigan Tax Tribunal Petition); Form 4546 for Board of Review residential.",
    practitionerNotes:
      "Local Board of Review (March) → Michigan Tax Tribunal (MTT); residential MTT petition deadline July 31; commercial / industrial May 31.",
  },

  // ─── NORTH CAROLINA ────────────────────────────────────────────────────────
  NC: {
    state: "North Carolina",
    stateCode: "NC",
    marketValueGround:
      "N.C. Gen. Stat. §105-283 (true value in money standard); §105-322 (county Board of Equalization and Review jurisdiction over value).",
    uniformityGround:
      "N.C. Const. Art. V §2(2) (just and equitable rule); §105-322 BER + §105-290 Property Tax Commission jurisdiction over uniformity.",
    recordErrorGround:
      "N.C. Gen. Stat. §105-322(g) (correction of clerical and factual errors); §105-381 (refund / release on assessment errors).",
    filingForm: "AV-14 (Notice of Appeal); county-specific appeal forms.",
    practitionerNotes:
      "County Board of Equalization and Review → NC Property Tax Commission → Court of Appeals; BER session typically April-May.",
  },

  // ─── COLORADO ──────────────────────────────────────────────────────────────
  CO: {
    state: "Colorado",
    stateCode: "CO",
    marketValueGround:
      "C.R.S. §39-1-103 (actual value standard, market approach for residential); §39-5-122 (assessor protest on grounds of value).",
    uniformityGround:
      "Colo. Const. Art. X §3 (uniform taxation); §39-8-108 (BAA jurisdiction encompasses uniformity).",
    recordErrorGround:
      "C.R.S. §39-5-125 (correction of errors); §39-10-114 (refund / abatement on factual errors).",
    filingForm: "DR 4015 (Petition for Abatement / Refund); county-specific protest forms during May.",
    practitionerNotes:
      "County Assessor → County Board of Equalization → Board of Assessment Appeals (BAA) or District Court; protest period May 1-Jun 1 for real property.",
  },

  // ─── ARIZONA ───────────────────────────────────────────────────────────────
  AZ: {
    state: "Arizona",
    stateCode: "AZ",
    marketValueGround:
      "A.R.S. §42-11001 (full cash value standard); §42-16201 (administrative appeal on grounds of value).",
    uniformityGround:
      "Ariz. Const. Art. IX §1 (uniform clause); §42-16252 (Tax Court jurisdiction encompasses uniformity / equalization).",
    recordErrorGround:
      "A.R.S. §42-16252 (correction of valuation / classification errors); §42-16215 (assessor's authority to correct).",
    filingForm: "Petition for Review of Real Property Valuation (DOR-prescribed).",
    practitionerNotes:
      "County Assessor → State Board of Equalization (Maricopa, Pima) or County BOE → Arizona Tax Court; appeal deadline 60 days from notice mailing.",
  },

  // ─── WASHINGTON ────────────────────────────────────────────────────────────
  WA: {
    state: "Washington",
    stateCode: "WA",
    marketValueGround:
      "RCW 84.40.030 (true and fair value standard); RCW 84.40.038 (petition to county Board of Equalization on grounds of value).",
    uniformityGround:
      "Wash. Const. Art. VII §1 (uniformity); RCW 84.48.010 (BOE equalization jurisdiction).",
    recordErrorGround:
      "RCW 84.48.065 (correction of manifest errors in the assessment).",
    filingForm: "REV 64 0075 (Petition for Property Tax Refund / Adjustment); county-specific BOE petition forms.",
    practitionerNotes:
      "County Board of Equalization → Washington State Board of Tax Appeals (BTA); BOE petition typically due July 1 or 60 days from notice.",
  },

  // ─── VIRGINIA ──────────────────────────────────────────────────────────────
  VA: {
    state: "Virginia",
    stateCode: "VA",
    marketValueGround:
      "Va. Code §58.1-3201 (fair market value standard); §58.1-3984 (judicial review on grounds of value).",
    uniformityGround:
      "Va. Const. Art. X §1 (uniform clause); §58.1-3379 (BOE equalization jurisdiction); §58.1-3984 (judicial uniformity remedy).",
    recordErrorGround:
      "Va. Code §58.1-3981 (correction of erroneous assessments).",
    filingForm: "Locality-specific BOE application; Form for Application for Correction of Erroneous Assessment.",
    practitionerNotes:
      "Local Commissioner of the Revenue → Board of Equalization → Circuit Court; Application deadline varies by locality (often 1-3 years from assessment).",
  },

  // ─── MINNESOTA ─────────────────────────────────────────────────────────────
  MN: {
    state: "Minnesota",
    stateCode: "MN",
    marketValueGround:
      "Minn. Stat. §273.11 (estimated market value standard); §274.01 (Local Board of Appeal and Equalization).",
    uniformityGround:
      "Minn. Const. Art. X §1 (uniform tax); §271.06 (MN Tax Court jurisdiction over equalization / uniformity).",
    recordErrorGround:
      "Minn. Stat. §273.13 + §272.02 (classification + factual error correction); §274.01 (LBAE jurisdiction over factual errors).",
    filingForm: "Minnesota Tax Court Real Estate Petition; county-specific LBAE application.",
    practitionerNotes:
      "Local Board → County Board of Appeal and Equalization → MN Tax Court (regular or small-claims division); Tax Court petition deadline April 30 of year following.",
  },

  // ─── MISSOURI ──────────────────────────────────────────────────────────────
  MO: {
    state: "Missouri",
    stateCode: "MO",
    marketValueGround:
      "Mo. Rev. Stat. §137.115 (true value in money standard); §138.060 (county BOE protest on grounds of value).",
    uniformityGround:
      "Mo. Const. Art. X §3 (uniform clause); §138.430 (State Tax Commission appeal on grounds of overvaluation OR unequal assessment).",
    recordErrorGround:
      "Mo. Rev. Stat. §137.270 (correction of errors); §139.031 (refund on factual error).",
    filingForm: "Form 11A (Application for Hearing — STC); county-specific BOE complaint forms.",
    practitionerNotes:
      "County BOE → State Tax Commission → Circuit Court; BOE deadline typically second Monday in July; STC appeal deadline Aug 15 or 30 days from BOE decision.",
  },

  // ─── MARYLAND ──────────────────────────────────────────────────────────────
  MD: {
    state: "Maryland",
    stateCode: "MD",
    marketValueGround:
      "Md. Tax-Property Code §8-104 (full cash value standard); §14-503 (administrative appeal on grounds of value).",
    uniformityGround:
      "Md. Const. Decl. of Rights Art. 15 (uniform rule); §14-512 (Property Tax Assessment Appeals Board jurisdiction over uniformity).",
    recordErrorGround:
      "Md. Tax-Property §14-1001 (correction of errors); §14-503 (administrative correction on factual error).",
    filingForm: "Petition for Review (filed with the Supervisor of Assessments) — SDAT-prescribed form.",
    practitionerNotes:
      "Supervisor of Assessments → Property Tax Assessment Appeals Board (PTAAB) → Maryland Tax Court → Circuit Court; petition deadline 45 days from assessment notice.",
  },
};

/**
 * Look up statutory citations for a given state postal code.
 * Returns null when no curated citation is available — the persuasion
 * brief then falls back to a generic instruction for the attorney to
 * fill in. We do NOT fabricate citations for uncovered states.
 */
export function getStatutoryCitations(stateCode: string | undefined | null): StatutoryCitations | null {
  if (!stateCode) return null;
  const key = stateCode.trim().toUpperCase();
  return CITATIONS[key] ?? null;
}

/**
 * Returns the list of state codes with curated citations. Useful for
 * tests and for surfacing coverage to the admin dashboard.
 */
export function listCoveredStates(): string[] {
  return Object.keys(CITATIONS).sort();
}
