# PDF Generator Audit Notes

## Errors Found
1. **Equity & Uniformity Analysis uses random numbers** (line 1177): `Math.random()` is used to generate comp assessment ratios. This is unprofessional and produces different results each time. Need to derive from actual data or use a deterministic formula.

2. **`nextSteps` field still in AppraisalReportData interface** (line 100): This is filing/strategy content that shouldn't appear in the assessor-facing report. It's in the interface but not rendered anywhere in the paid report — safe but should be removed from interface for clarity.

3. **Global mutable `_pageNumber`** (line 215): If two reports generate concurrently, page numbers will be wrong. Need to scope per-report.

## Gaps / Enhancements Needed
1. **No "Scope of Work" section** — Professional appraisals always include this. Should describe what was done.
2. **No "Purpose & Intended Use" section** — Should explicitly state the report is for property tax appeal.
3. **Equity section needs real data** — Should compute ratios from actual comp data (assessed/sale price) rather than random.
4. **Tax Impact section** — The effective tax rate derivation is fragile. Should use a more robust calculation.
5. **Reconciliation section** — When no reconciliationNarrative is provided, there's no fallback narrative.
6. **Cover page** — Could add the estimated market value prominently.
7. **Letter of Transmittal** — Should include the owner's name if available.
8. **Missing "Extraordinary Assumptions"** — USPAP requires this.
9. **Photo Gallery** — Should group by category (exterior, interior, roof, etc.) with category headers.
10. **Adjustment Grid** — The dollar adjustment calculation uses percentage * salePrice which may not match the actual adjustmentGrid data. The entry already has `adjustedValue` — should use the raw dollar amounts from `entry.adjustments` directly if they're already dollar amounts.

## Content Quality Improvements
1. Add more professional language to Area & Neighborhood section
2. Add "Scope of Work" after Certification
3. Add "Purpose & Intended Use" 
4. Make Equity section deterministic using comp sale prices vs assessed values
5. Add fallback reconciliation narrative
6. Group photos by category
7. Fix concurrent page number bug
