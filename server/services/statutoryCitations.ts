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
