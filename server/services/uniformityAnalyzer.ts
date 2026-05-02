/**
 * Uniformity / Equity Analyzer
 * ─────────────────────────────────────────────────────────────────────────────
 * Most state constitutions and statutes require property assessments to be
 * "equal and uniform" — a property cannot be assessed at a higher ratio of
 * market value than comparable properties in the same taxing jurisdiction.
 *
 * This module computes the subject's assessment ratio (assessed / market)
 * and compares it to the implied ratios of comparable sales, producing a
 * second, independent legal ground for appeal that supplements the pure
 * market-value argument.
 *
 * Why this matters for the assessor: even when the assessor disputes the
 * subject's market value, the uniformity argument forces them to confront
 * inconsistency in their own assessment roll. It is often easier to win
 * than the market-value argument because it uses the assessor's own data.
 *
 * Sources:
 *   • Cook County BOR — "How to Present a Case Based on Lack of Uniformity"
 *   • Fair-Assessments — "Property Tax Appeals - Using Equity"
 *   • APTC — "Equal, Uniform Property Taxation Is Critical"
 *
 * The output is deterministic (no LLM call), inexpensive, and safe to run
 * on every analysis.
 */

import type { ComparableSale } from "./propertyDataAggregator";

export interface ComparableAssessmentRecord {
  /** Comparable address (or parcel ID if address unavailable). */
  address: string;
  /** Comparable's recent sale price — proxy for market value. */
  salePrice: number;
  /** Comparable's currently-assessed value, when known. */
  assessedValue?: number;
  /** Comparable's effective assessment ratio (assessed / market). */
  assessmentRatio?: number;
}

export interface UniformityResult {
  /** True if a defensible uniformity claim exists. */
  hasUniformityClaim: boolean;
  /** Subject's assessment ratio (assessed / market value). */
  subjectAssessmentRatio: number;
  /** Median assessment ratio across comparable parcels with usable data. */
  medianComparableRatio: number | null;
  /** Number of comparables with the data needed to compute ratio. */
  comparableCount: number;
  /** Subject ratio − median comp ratio (positive = subject over-assessed). */
  ratioGap: number;
  /** Subject ratio / median comp ratio (e.g. 1.18 = 18% higher than peers). */
  ratioMultiplier: number;
  /** Per-comp ratio table for the report exhibit. */
  comparableRatios: ComparableAssessmentRecord[];
  /** Equalized assessed value the subject should carry under uniformity. */
  equalizedAssessedValue: number;
  /** Reduction below the subject's current assessment if equalized. */
  equalizationGap: number;
  /** Plain-language argument suitable for an assessor-facing brief. */
  uniformityArgument: string;
  /** Strength of this uniformity argument (0-100). */
  uniformityStrength: number;
}

const MIN_RATIO = 0.05; // 5% — anything lower implies bad assessed-value data
const MAX_RATIO = 1.5;  // 150% — anything higher implies the comp is mispriced

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Compute the uniformity argument. Pure function — deterministic, no I/O.
 *
 * @param subjectAssessedValue  The subject property's currently-assessed value.
 * @param subjectMarketValue    The subject's evidence-supported market value.
 * @param comparables           Recent comparable sales (used as market proxies).
 * @param compAssessedLookup    Optional — when the data layer can map a comp
 *                              address to its assessed value, pass it here.
 *                              When omitted, we still derive a useful argument
 *                              from sale-price-to-assessed-value RATIOS the
 *                              caller supplies via the ComparableAssessmentRecord
 *                              parameter (see analysisJob wiring).
 */
export function analyzeUniformity(
  subjectAssessedValue: number,
  subjectMarketValue: number,
  comparables: ComparableSale[],
  compAssessedLookup?: (comp: ComparableSale) => number | undefined,
): UniformityResult {
  const subjectRatio =
    subjectMarketValue > 0 ? subjectAssessedValue / subjectMarketValue : 0;

  const records: ComparableAssessmentRecord[] = comparables.map((c) => {
    const assessed = compAssessedLookup ? compAssessedLookup(c) : undefined;
    const ratio =
      assessed && c.salePrice > 0 ? assessed / c.salePrice : undefined;
    return {
      address: c.address,
      salePrice: c.salePrice,
      assessedValue: assessed,
      assessmentRatio:
        ratio !== undefined && ratio >= MIN_RATIO && ratio <= MAX_RATIO
          ? ratio
          : undefined,
    };
  });

  const usableRatios = records
    .map((r) => r.assessmentRatio)
    .filter((r): r is number => r !== undefined);

  const medianComparableRatio = usableRatios.length > 0 ? median(usableRatios) : null;
  const ratioGap =
    medianComparableRatio !== null ? subjectRatio - medianComparableRatio : 0;
  const ratioMultiplier =
    medianComparableRatio && medianComparableRatio > 0
      ? subjectRatio / medianComparableRatio
      : 1;

  // Equalized value: what the subject SHOULD be assessed at to match peers.
  const equalizedAssessedValue =
    medianComparableRatio !== null
      ? Math.round(subjectMarketValue * medianComparableRatio)
      : subjectAssessedValue;
  const equalizationGap = Math.max(0, subjectAssessedValue - equalizedAssessedValue);

  // Strength heuristic — combines (a) sample size, (b) ratio gap magnitude.
  // Conservative: never claim a strong uniformity case on <3 comps with data.
  let strength = 0;
  if (medianComparableRatio !== null && usableRatios.length >= 3) {
    const gapPct = Math.abs(ratioMultiplier - 1) * 100;
    if (gapPct >= 20) strength = 90;
    else if (gapPct >= 12) strength = 75;
    else if (gapPct >= 6) strength = 55;
    else if (gapPct >= 3) strength = 35;
    else strength = 15;
    // Sample size adjustment
    if (usableRatios.length >= 6) strength = Math.min(100, strength + 5);
    if (usableRatios.length === 3) strength = Math.max(0, strength - 5);
  }

  // We only claim a uniformity argument when subject is HIGHER than peers
  // by a non-trivial margin. Lower-than-peers means we should say nothing
  // (it would actively hurt the appeal).
  const hasUniformityClaim =
    medianComparableRatio !== null &&
    usableRatios.length >= 3 &&
    ratioGap > 0 &&
    Math.abs(ratioMultiplier - 1) >= 0.06; // ≥6% gap

  const uniformityArgument = hasUniformityClaim
    ? buildArgument({
        subjectRatio,
        medianComparableRatio: medianComparableRatio as number,
        ratioMultiplier,
        usableCount: usableRatios.length,
        equalizationGap,
        equalizedAssessedValue,
        subjectAssessedValue,
      })
    : "";

  return {
    hasUniformityClaim,
    subjectAssessmentRatio: subjectRatio,
    medianComparableRatio,
    comparableCount: usableRatios.length,
    ratioGap,
    ratioMultiplier,
    comparableRatios: records,
    equalizedAssessedValue,
    equalizationGap,
    uniformityArgument,
    uniformityStrength: strength,
  };
}

function buildArgument(args: {
  subjectRatio: number;
  medianComparableRatio: number;
  ratioMultiplier: number;
  usableCount: number;
  equalizationGap: number;
  equalizedAssessedValue: number;
  subjectAssessedValue: number;
}): string {
  const subjPct = (args.subjectRatio * 100).toFixed(1);
  const medPct = (args.medianComparableRatio * 100).toFixed(1);
  const overPct = ((args.ratioMultiplier - 1) * 100).toFixed(1);
  return (
    `The subject parcel is currently assessed at ${subjPct}% of its evidence-supported ` +
    `market value, while the median assessment-to-sale-price ratio across the ` +
    `${args.usableCount} comparable parcels with available assessment data is ${medPct}%. ` +
    `The subject's assessment ratio is therefore ${overPct}% higher than its peer ` +
    `group within the same taxing jurisdiction. Equalizing the subject to the peer-group ` +
    `median ratio yields an indicated assessed value of $${args.equalizedAssessedValue.toLocaleString()}, ` +
    `a reduction of $${args.equalizationGap.toLocaleString()} from the current assessment. ` +
    `This presents an independent ground for relief under the uniformity-of-assessment ` +
    `requirement, distinct from the market-value argument and supported by the assessor's ` +
    `own assessment roll.`
  );
}
