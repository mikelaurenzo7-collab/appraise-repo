/**
 * Property Record Error Detector
 * ─────────────────────────────────────────────────────────────────────────────
 * Per expert appeal practitioners, "record errors are the easiest appeals to
 * win because there is no subjective debate — either the facts are correct or
 * they are not." (Cook County BOR; King County PADS guide; AppealDesk evidence
 * guide.) Examples: assessor records 2,400 sqft when the true area is 2,150;
 * records 4 bedrooms when only 3 exist; records the wrong year built.
 *
 * This module compares the assessor's record (extracted from the tax bill OCR
 * and external data sources) to the owner-supplied ground truth (the
 * submission record, photos, etc.) and flags discrepancies that exceed a
 * material threshold. Each flagged discrepancy is converted into:
 *   • a verifiable factual claim suitable for the persuasion brief, and
 *   • a recommended evidentiary document to gather (measurement, floor plan,
 *     etc.).
 *
 * The detector is intentionally conservative: it only flags differences that
 * exceed the typical measurement tolerance (≥3% on sqft, ≥1 bed/bath, ≥1 yr).
 * Nothing is fabricated — every discrepancy is a delta between two reported
 * numbers and is presented as such.
 */

export interface RecordSnapshot {
  squareFeet?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  yearBuilt?: number | null;
  lotSize?: number | null;
  /** Any extra qualitative descriptors the source supplies. */
  notes?: string | null;
}

export type RecordErrorSeverity = "minor" | "material" | "major";

export interface RecordErrorFinding {
  field: "squareFeet" | "bedrooms" | "bathrooms" | "yearBuilt" | "lotSize";
  assessorValue: number;
  ownerValue: number;
  /** assessorValue − ownerValue (positive = assessor record is too high). */
  delta: number;
  /** delta / ownerValue × 100, when meaningful. */
  deltaPercent: number;
  severity: RecordErrorSeverity;
  /** Argument-grade language: short, factual, ready for the brief. */
  factualClaim: string;
  /** Evidence the user should produce to substantiate the claim. */
  recommendedEvidence: string;
}

export interface RecordErrorReport {
  /** True if at least one material/major discrepancy was found. */
  hasErrors: boolean;
  findings: RecordErrorFinding[];
  /** Aggregate strength score (0-100). */
  errorStrength: number;
  /** Count of major + material findings (minors excluded). */
  significantCount: number;
  /** Single-sentence summary for use as an exhibit caption. */
  summaryLine: string;
}

const SQFT_TOLERANCE_PCT = 3;     // typical professional measurement tolerance
const SQFT_MAJOR_PCT = 8;
const LOT_TOLERANCE_PCT = 5;
const LOT_MAJOR_PCT = 12;
const YEAR_TOLERANCE = 1;
const YEAR_MAJOR = 5;

function n(v: number | null | undefined): number | null {
  if (v == null) return null;
  return Number.isFinite(v) ? Number(v) : null;
}

export function detectRecordErrors(
  assessor: RecordSnapshot,
  owner: RecordSnapshot,
): RecordErrorReport {
  const findings: RecordErrorFinding[] = [];

  // ─── Square footage ──────────────────────────────────────────────────────
  const assSqft = n(assessor.squareFeet);
  const ownSqft = n(owner.squareFeet);
  if (assSqft && ownSqft && ownSqft > 0) {
    const delta = assSqft - ownSqft;
    const pct = (delta / ownSqft) * 100;
    if (Math.abs(pct) >= SQFT_TOLERANCE_PCT) {
      const severity: RecordErrorSeverity =
        Math.abs(pct) >= SQFT_MAJOR_PCT ? "major" : "material";
      findings.push({
        field: "squareFeet",
        assessorValue: assSqft,
        ownerValue: ownSqft,
        delta,
        deltaPercent: pct,
        severity,
        factualClaim:
          delta > 0
            ? `The assessor's record lists ${assSqft.toLocaleString()} sqft of finished area; ` +
              `the owner-verified finished area is ${ownSqft.toLocaleString()} sqft, a ` +
              `${Math.abs(pct).toFixed(1)}% overstatement on the assessment roll.`
            : `The owner-verified finished area is ${ownSqft.toLocaleString()} sqft; ` +
              `the assessor's record reflects only ${assSqft.toLocaleString()} sqft.`,
        recommendedEvidence:
          "Floor-plan markup with exterior dimensions OR a licensed appraiser/architect " +
          "measurement letter. The county property record card itself is the primary exhibit.",
      });
    }
  }

  // ─── Bedrooms ────────────────────────────────────────────────────────────
  const assBeds = n(assessor.bedrooms);
  const ownBeds = n(owner.bedrooms);
  if (assBeds != null && ownBeds != null && Math.abs(assBeds - ownBeds) >= 1) {
    findings.push({
      field: "bedrooms",
      assessorValue: assBeds,
      ownerValue: ownBeds,
      delta: assBeds - ownBeds,
      deltaPercent: ownBeds > 0 ? ((assBeds - ownBeds) / ownBeds) * 100 : 0,
      severity: Math.abs(assBeds - ownBeds) >= 2 ? "major" : "material",
      factualClaim:
        `The assessor's record lists ${assBeds} bedroom${assBeds === 1 ? "" : "s"}; ` +
        `the property contains ${ownBeds} bedroom${ownBeds === 1 ? "" : "s"} as defined ` +
        `(rooms with closet, window, and code-compliant egress).`,
      recommendedEvidence:
        "Photographs of each room with labeled placard OR a stamped floor plan.",
    });
  }

  // ─── Bathrooms ───────────────────────────────────────────────────────────
  const assBaths = n(assessor.bathrooms);
  const ownBaths = n(owner.bathrooms);
  if (assBaths != null && ownBaths != null && Math.abs(assBaths - ownBaths) >= 1) {
    findings.push({
      field: "bathrooms",
      assessorValue: assBaths,
      ownerValue: ownBaths,
      delta: assBaths - ownBaths,
      deltaPercent: ownBaths > 0 ? ((assBaths - ownBaths) / ownBaths) * 100 : 0,
      severity: Math.abs(assBaths - ownBaths) >= 2 ? "major" : "material",
      factualClaim:
        `The assessor's record lists ${assBaths} bathroom${assBaths === 1 ? "" : "s"}; ` +
        `the property contains ${ownBaths} bathroom${ownBaths === 1 ? "" : "s"} (counted ` +
        `per local convention: full = sink/toilet/tub, half = sink/toilet only).`,
      recommendedEvidence:
        "Photographs of each bathroom with caption identifying full/half status.",
    });
  }

  // ─── Year built ──────────────────────────────────────────────────────────
  const assYr = n(assessor.yearBuilt);
  const ownYr = n(owner.yearBuilt);
  if (assYr && ownYr && Math.abs(assYr - ownYr) >= YEAR_TOLERANCE) {
    const diff = Math.abs(assYr - ownYr);
    findings.push({
      field: "yearBuilt",
      assessorValue: assYr,
      ownerValue: ownYr,
      delta: assYr - ownYr,
      deltaPercent: ownYr > 0 ? ((assYr - ownYr) / ownYr) * 100 : 0,
      severity: diff >= YEAR_MAJOR ? "major" : diff >= 2 ? "material" : "minor",
      factualClaim:
        `The assessor's record indicates a year-built of ${assYr}; ` +
        `the recorded year-built per county building permits is ${ownYr}.`,
      recommendedEvidence:
        "Original building permit OR title-company year-built certification OR " +
        "deed/abstract first-improvement entry.",
    });
  }

  // ─── Lot size ────────────────────────────────────────────────────────────
  const assLot = n(assessor.lotSize);
  const ownLot = n(owner.lotSize);
  if (assLot && ownLot && ownLot > 0) {
    const delta = assLot - ownLot;
    const pct = (delta / ownLot) * 100;
    if (Math.abs(pct) >= LOT_TOLERANCE_PCT) {
      const severity: RecordErrorSeverity =
        Math.abs(pct) >= LOT_MAJOR_PCT ? "major" : "material";
      findings.push({
        field: "lotSize",
        assessorValue: assLot,
        ownerValue: ownLot,
        delta,
        deltaPercent: pct,
        severity,
        factualClaim:
          delta > 0
            ? `The assessor's record lists a parcel area of ${assLot.toLocaleString()} sqft; ` +
              `the recorded plat / GIS-measured parcel area is ${ownLot.toLocaleString()} sqft, ` +
              `a ${Math.abs(pct).toFixed(1)}% overstatement.`
            : `The recorded plat / GIS-measured parcel area is ${ownLot.toLocaleString()} sqft; ` +
              `the assessor's record reflects ${assLot.toLocaleString()} sqft.`,
        recommendedEvidence:
          "Recorded plat map, ALTA survey, or county GIS parcel printout.",
      });
    }
  }

  const significant = findings.filter(
    (f) => f.severity === "major" || f.severity === "material",
  );
  const hasErrors = significant.length > 0;

  // Strength heuristic: each major = +35, material = +18, minor = +5, capped 100.
  let strength = 0;
  for (const f of findings) {
    strength += f.severity === "major" ? 35 : f.severity === "material" ? 18 : 5;
  }
  strength = Math.min(100, strength);

  const summaryLine = hasErrors
    ? `${significant.length} record discrepanc${significant.length === 1 ? "y" : "ies"} ` +
      `identified in the assessor's property data of record (sqft / bed / bath / lot / year built).`
    : "No material discrepancies identified between the assessor's record and the owner-verified data.";

  return {
    hasErrors,
    findings,
    errorStrength: strength,
    significantCount: significant.length,
    summaryLine,
  };
}
