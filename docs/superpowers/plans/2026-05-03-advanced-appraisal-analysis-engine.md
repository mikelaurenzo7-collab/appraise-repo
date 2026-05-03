# Advanced Appraisal Analysis Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four dedicated calculator services (comparable-sales adjustment grid, cost approach, income approach, market trend) plus photo cost-to-cure estimates, wire them all into the existing `analysisJob.ts` pipeline, and generate a reconciliation narrative — replacing the sparse LLM-passthrough data that currently sits in those DB columns with methodologically-rigorous computed values.

**Architecture:** Each calculator is a pure TypeScript module that takes structured inputs (already available in the pipeline) and returns typed outputs matching the interfaces already defined in `pdfGenerator.ts`. `analysisJob.ts` calls each calculator sequentially after the LLM analysis step, merges results into the DB write, and calls a new `generateReconciliationNarrative()` helper that uses the combined outputs to produce the final narrative via Claude.

**Tech Stack:** TypeScript, Vitest (unit tests), existing `invokeLLM`/`analyzeWithClaude` from `server/_core/`, `PropertyData`/`ComparableSale` from `propertyDataAggregator.ts`, `AdjustmentGridEntry`/`CostApproachData`/`IncomeApproachSummary`/`MarketTrendData` from `pdfGenerator.ts`.

---

## Key Existing Interfaces (read before any task)

```typescript
// server/services/propertyDataAggregator.ts
interface PropertyData {
  address: string;
  squareFeet?: number;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  lotSize?: number;
  assessedValue?: number;
  estimatedValue?: number;
  propertyType?: string;
  comparableSales?: ComparableSale[];
  rentalComps?: RentalComp[];
  marketRent?: number;
  latitude?: number;
  longitude?: number;
  // ...more fields
}

interface ComparableSale {
  address: string;
  salePrice: number;
  saleDate: string; // ISO string
  squareFeet: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  lotSize?: number;
  daysOnMarket?: number;
  latitude?: number;
  longitude?: number;
  similarity: number; // 0-1
  assessedValue?: number;
  transactionType?: "arms_length" | "foreclosure" | "reo" | "short_sale" | "family_transfer" | "auction" | "unknown";
  source: "mls" | "rentcast" | "attom" | "redfin";
}

// server/services/pdfGenerator.ts
interface AdjustmentGridEntry {
  compAddress: string;
  salePrice: number;
  adjustments: Record<string, number>; // e.g. { time: -5000, size: 8000, condition: -3000 }
  netAdjustmentPct: number;
  adjustedValue: number;
  pricePerUnit?: number;
  pricePerSF?: number;
}

interface IncomeApproachSummary {
  marketRentPerUnit: number;
  totalUnits: number;
  grossPotentialIncome: number;
  vacancyRate: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  netOperatingIncome: number;
  capRate: number;
  incomeValue: number;
}

interface CostApproachData {
  landValue?: number | null;
  improvementValue?: number | null;
  replacementCostNew?: number | null;
  totalDepreciation?: number | null;
  effectiveAge?: number | null;
  remainingEconomicLife?: number | null;
  costApproachValue?: number | null;
}

interface MarketTrendData {
  medianSalePrice?: number | null;
  medianPricePerSF?: number | null;
  averageDaysOnMarket?: number | null;
  inventoryCount?: number | null;
  priceChangeYoY?: number | null;
  absorptionRate?: number | null;
}
```

## File Map

| File | Action | Responsibility |
|---|---|---|
| `server/services/comparableSalesAnalyzer.ts` | **Create** | Build AdjustmentGridEntry[] from ComparableSale[] |
| `server/services/costApproachCalculator.ts` | **Create** | Compute CostApproachData from PropertyData |
| `server/services/incomeApproachCalculator.ts` | **Create** | Compute IncomeApproachSummary from PropertyData |
| `server/services/marketTrendAnalyzer.ts` | **Create** | Compute MarketTrendData from ComparableSale[] |
| `server/services/photoAnalyzer.ts` | **Modify** | Add costToCureEstimate to PhotoFinding |
| `server/services/analysisJob.ts` | **Modify** | Call all calculators, wire into DB write |
| `server/comparableSalesAnalyzer.test.ts` | **Create** | Tests for comparable sales adjuster |
| `server/costApproachCalculator.test.ts` | **Create** | Tests for cost approach calculator |
| `server/incomeApproachCalculator.test.ts` | **Create** | Tests for income approach calculator |
| `server/marketTrendAnalyzer.test.ts` | **Create** | Tests for market trend analyzer |

---

## Task 1: ComparableSalesAnalyzer

**Files:**
- Create: `server/services/comparableSalesAnalyzer.ts`
- Create: `server/comparableSalesAnalyzer.test.ts`

This service takes the subject property's characteristics and a list of comparable sales, applies systematic dollar adjustments (time, size, condition proxy, bedroom count), and returns a sorted `AdjustmentGridEntry[]` suitable for the PDF adjustment grid table.

**Adjustment methodology:**
- **Time adjustment:** 0.3% per month since sale date (market appreciation proxy). Applied as `salePrice × (monthsSinceSale × 0.003)`.
- **Size adjustment:** `(subjectSF - compSF) × medianPricePerSF × 0.85`. The 0.85 discount reflects the diminishing marginal value of additional SF.
- **Bedroom adjustment:** `(subjectBeds - compBeds) × 5000` per bed difference.
- **Bathroom adjustment:** `(subjectBaths - compBaths) × 3000` per bath difference.
- **Age adjustment:** `(compYearBuilt - subjectYearBuilt) × 500` (older subject = downward adjustment on comp).
- **Lot size adjustment:** `(subjectLotSF - compLotSF) × 2.50` per SF difference (residential), capped at ±$15,000.
- Net adjustment is capped at ±30% of sale price (market data credibility threshold).

- [ ] **Step 1: Write failing test**

```typescript
// server/comparableSalesAnalyzer.test.ts
import { describe, it, expect } from "vitest";
import {
  buildAdjustmentGrid,
  computeMedianPricePerSF,
  applyTimeAdjustment,
} from "./services/comparableSalesAnalyzer";
import type { ComparableSale } from "./services/propertyDataAggregator";

const makeComp = (overrides: Partial<ComparableSale> = {}): ComparableSale => ({
  address: "123 Comp St",
  salePrice: 300000,
  saleDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
  squareFeet: 1500,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 2000,
  lotSize: 6000,
  similarity: 0.9,
  source: "redfin",
  transactionType: "arms_length",
  ...overrides,
});

describe("comparableSalesAnalyzer", () => {
  it("applies positive time adjustment for older sale", () => {
    const comp = makeComp({ saleDate: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000).toISOString() });
    const adjustment = applyTimeAdjustment(comp.salePrice, comp.saleDate);
    expect(adjustment).toBeGreaterThan(0); // 12 months old → positive upward adj
    expect(adjustment).toBeCloseTo(300000 * 12 * 0.003, 0); // ~$10,800
  });

  it("computes median price per SF from comps", () => {
    const comps = [
      makeComp({ salePrice: 300000, squareFeet: 1500 }), // $200/SF
      makeComp({ salePrice: 400000, squareFeet: 2000 }), // $200/SF
      makeComp({ salePrice: 250000, squareFeet: 1250 }), // $200/SF
    ];
    expect(computeMedianPricePerSF(comps)).toBeCloseTo(200, 0);
  });

  it("builds adjustment grid with all entries", () => {
    const subject = { squareFeet: 1400, bedrooms: 3, bathrooms: 2, yearBuilt: 1995, lotSize: 5000 };
    const comps = [makeComp(), makeComp({ address: "456 Other St", salePrice: 320000 })];
    const grid = buildAdjustmentGrid(subject, comps);
    expect(grid).toHaveLength(2);
    expect(grid[0]).toHaveProperty("compAddress");
    expect(grid[0]).toHaveProperty("adjustments");
    expect(grid[0]).toHaveProperty("adjustedValue");
    expect(grid[0]).toHaveProperty("netAdjustmentPct");
  });

  it("caps net adjustment at ±30% of sale price", () => {
    const subject = { squareFeet: 500, bedrooms: 1, bathrooms: 1, yearBuilt: 1920, lotSize: 1000 };
    const comp = makeComp({ salePrice: 300000, squareFeet: 3000, bedrooms: 6, bathrooms: 4, yearBuilt: 2020, lotSize: 20000 });
    const [entry] = buildAdjustmentGrid(subject, [comp]);
    expect(Math.abs(entry.netAdjustmentPct)).toBeLessThanOrEqual(30);
  });

  it("excludes non-arms-length comps when flag set", () => {
    const subject = { squareFeet: 1500, bedrooms: 3, bathrooms: 2, yearBuilt: 2000, lotSize: 6000 };
    const comps = [
      makeComp({ transactionType: "foreclosure" }),
      makeComp({ address: "999 Normal St", transactionType: "arms_length" }),
    ];
    const grid = buildAdjustmentGrid(subject, comps, { excludeNonArmsLength: true });
    expect(grid).toHaveLength(1);
    expect(grid[0].compAddress).toBe("999 Normal St");
  });

  it("sorts grid by adjusted value ascending (most favorable first)", () => {
    const subject = { squareFeet: 1500, bedrooms: 3, bathrooms: 2, yearBuilt: 2000, lotSize: 6000 };
    const comps = [
      makeComp({ address: "High St", salePrice: 400000 }),
      makeComp({ address: "Low St", salePrice: 250000 }),
      makeComp({ address: "Mid St", salePrice: 320000 }),
    ];
    const grid = buildAdjustmentGrid(subject, comps);
    expect(grid[0].adjustedValue).toBeLessThanOrEqual(grid[1].adjustedValue);
    expect(grid[1].adjustedValue).toBeLessThanOrEqual(grid[2].adjustedValue);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/appraise-repo && npx vitest run server/comparableSalesAnalyzer.test.ts 2>&1 | tail -20
```
Expected: FAIL — "Cannot find module './services/comparableSalesAnalyzer'"

- [ ] **Step 3: Implement the service**

```typescript
// server/services/comparableSalesAnalyzer.ts
import type { ComparableSale } from "./propertyDataAggregator";
import type { AdjustmentGridEntry } from "./pdfGenerator";

export interface SubjectCharacteristics {
  squareFeet?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  yearBuilt?: number | null;
  lotSize?: number | null;
}

export interface AdjustmentGridOptions {
  excludeNonArmsLength?: boolean;
  maxComps?: number;
}

const ARM_LENGTH_TYPES = new Set(["arms_length", "unknown", undefined]);
const MONTHLY_APPRECIATION_RATE = 0.003; // 0.3% per month
const SIZE_DISCOUNT = 0.85;
const BED_ADJUSTMENT = 5000;
const BATH_ADJUSTMENT = 3000;
const AGE_ADJUSTMENT_PER_YEAR = 500;
const LOT_ADJUSTMENT_PER_SF = 2.5;
const LOT_CAP = 15000;
const MAX_NET_ADJUSTMENT_PCT = 30;

export function applyTimeAdjustment(salePrice: number, saleDate: string): number {
  const months = (Date.now() - new Date(saleDate).getTime()) / (30 * 24 * 60 * 60 * 1000);
  return Math.round(salePrice * Math.max(0, months) * MONTHLY_APPRECIATION_RATE);
}

export function computeMedianPricePerSF(comps: ComparableSale[]): number {
  const ppsf = comps
    .filter((c) => c.squareFeet > 0)
    .map((c) => c.salePrice / c.squareFeet)
    .sort((a, b) => a - b);
  if (ppsf.length === 0) return 0;
  const mid = Math.floor(ppsf.length / 2);
  return ppsf.length % 2 === 1 ? ppsf[mid] : (ppsf[mid - 1] + ppsf[mid]) / 2;
}

export function buildAdjustmentGrid(
  subject: SubjectCharacteristics,
  comps: ComparableSale[],
  opts: AdjustmentGridOptions = {},
): AdjustmentGridEntry[] {
  const { excludeNonArmsLength = false, maxComps = 8 } = opts;

  const eligible = excludeNonArmsLength
    ? comps.filter((c) => ARM_LENGTH_TYPES.has(c.transactionType))
    : comps;

  const medianPSF = computeMedianPricePerSF(eligible);

  const entries: AdjustmentGridEntry[] = eligible.slice(0, maxComps).map((comp) => {
    const adjustments: Record<string, number> = {};

    // Time adjustment
    const timeAdj = applyTimeAdjustment(comp.salePrice, comp.saleDate);
    if (timeAdj !== 0) adjustments.time = timeAdj;

    // Size adjustment
    if (subject.squareFeet && comp.squareFeet && medianPSF > 0) {
      const sizeAdj = Math.round((subject.squareFeet - comp.squareFeet) * medianPSF * SIZE_DISCOUNT);
      if (sizeAdj !== 0) adjustments.size = sizeAdj;
    }

    // Bedroom adjustment
    if (subject.bedrooms != null && comp.bedrooms != null) {
      const bedAdj = (subject.bedrooms - comp.bedrooms) * BED_ADJUSTMENT;
      if (bedAdj !== 0) adjustments.bedrooms = bedAdj;
    }

    // Bathroom adjustment
    if (subject.bathrooms != null && comp.bathrooms != null) {
      const bathAdj = Math.round((subject.bathrooms - comp.bathrooms) * BATH_ADJUSTMENT);
      if (bathAdj !== 0) adjustments.bathrooms = bathAdj;
    }

    // Age adjustment
    if (subject.yearBuilt && comp.yearBuilt) {
      const ageAdj = (comp.yearBuilt - subject.yearBuilt) * AGE_ADJUSTMENT_PER_YEAR;
      if (ageAdj !== 0) adjustments.age = ageAdj;
    }

    // Lot size adjustment
    if (subject.lotSize != null && comp.lotSize != null) {
      const rawLotAdj = Math.round((subject.lotSize - comp.lotSize) * LOT_ADJUSTMENT_PER_SF);
      const lotAdj = Math.max(-LOT_CAP, Math.min(LOT_CAP, rawLotAdj));
      if (lotAdj !== 0) adjustments.lot = lotAdj;
    }

    const totalAdj = Object.values(adjustments).reduce((s, v) => s + v, 0);
    const rawNetPct = (totalAdj / comp.salePrice) * 100;
    // Cap net adjustment
    const netAdjustmentPct = Math.max(-MAX_NET_ADJUSTMENT_PCT, Math.min(MAX_NET_ADJUSTMENT_PCT, rawNetPct));
    const cappedTotalAdj = Math.round((netAdjustmentPct / 100) * comp.salePrice);
    const adjustedValue = comp.salePrice + cappedTotalAdj;

    return {
      compAddress: comp.address,
      salePrice: comp.salePrice,
      adjustments,
      netAdjustmentPct: Math.round(netAdjustmentPct * 10) / 10,
      adjustedValue,
      pricePerSF: comp.squareFeet > 0 ? Math.round(comp.salePrice / comp.squareFeet) : undefined,
    };
  });

  // Sort ascending (most favorable / lowest value first)
  return entries.sort((a, b) => a.adjustedValue - b.adjustedValue);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/user/appraise-repo && npx vitest run server/comparableSalesAnalyzer.test.ts 2>&1 | tail -20
```
Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
cd /home/user/appraise-repo && git add server/services/comparableSalesAnalyzer.ts server/comparableSalesAnalyzer.test.ts && git commit -m "feat: add comparable sales adjustment grid calculator"
```

---

## Task 2: CostApproachCalculator

**Files:**
- Create: `server/services/costApproachCalculator.ts`
- Create: `server/costApproachCalculator.test.ts`

Computes the cost approach to value: `Land Value + (Replacement Cost New - Depreciation) = Cost Approach Value`.

**Methodology:**
- **Replacement cost per SF** by property type (residential: $165/SF, multi-family: $140/SF, commercial: $175/SF, industrial: $90/SF, agricultural: $75/SF, default: $150/SF).
- **Physical depreciation:** `(effectiveAge / economicLife) × replacementCostNew`. Economic life by type: residential 75yr, commercial 50yr, industrial 40yr, agricultural 35yr.
- **Effective age** = `max(chronologicalAge × 0.7, chronologicalAge - renovationBenefit)`. If no renovation data, use chronological age.
- **Functional obsolescence:** 5% if yearBuilt < 1960, else 2% if yearBuilt < 1980, else 0.
- **Land value:** estimated at 20% of assessedValue (national average land-to-value ratio for single-family). For commercial: 25%. Falls back to `estimatedValue × 0.20` if no assessed value.
- **Total depreciation** = physical + functional + external (external = 0 unless we have evidence).

- [ ] **Step 1: Write failing test**

```typescript
// server/costApproachCalculator.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateCostApproach,
  computeReplacementCostPerSF,
  computePhysicalDepreciation,
  estimateLandValue,
} from "./services/costApproachCalculator";

describe("costApproachCalculator", () => {
  it("returns replacement cost per SF by property type", () => {
    expect(computeReplacementCostPerSF("residential")).toBe(165);
    expect(computeReplacementCostPerSF("commercial")).toBe(175);
    expect(computeReplacementCostPerSF("industrial")).toBe(90);
    expect(computeReplacementCostPerSF("agricultural")).toBe(75);
    expect(computeReplacementCostPerSF("unknown_type")).toBe(150); // default
  });

  it("computes physical depreciation correctly", () => {
    // 30yr / 75yr = 40% depreciation on $200k = $80k
    const dep = computePhysicalDepreciation(200000, 30, "residential");
    expect(dep).toBeCloseTo(80000, -2);
  });

  it("caps physical depreciation at 80% of replacement cost", () => {
    // 90yr old residential = 90/75 = 120% → capped at 80%
    const dep = computePhysicalDepreciation(200000, 90, "residential");
    expect(dep).toBe(160000); // 80% of 200000
  });

  it("estimates land value as percentage of assessed value", () => {
    const land = estimateLandValue({ assessedValue: 400000, propertyType: "residential" });
    expect(land).toBe(80000); // 20% of 400000
  });

  it("calculates full cost approach value", () => {
    const result = calculateCostApproach({
      squareFeet: 2000,
      yearBuilt: 2000,
      assessedValue: 500000,
      propertyType: "residential",
    });
    expect(result.replacementCostNew).toBeDefined();
    expect(result.replacementCostNew).toBeCloseTo(2000 * 165, 0); // $330,000
    expect(result.landValue).toBeDefined();
    expect(result.totalDepreciation).toBeDefined();
    expect(result.costApproachValue).toBeDefined();
    expect(result.costApproachValue).toBeGreaterThan(0);
    expect(result.effectiveAge).toBeDefined();
    expect(result.remainingEconomicLife).toBeDefined();
  });

  it("returns null costApproachValue when squareFeet missing", () => {
    const result = calculateCostApproach({
      squareFeet: undefined,
      yearBuilt: 2000,
      assessedValue: 400000,
      propertyType: "residential",
    });
    expect(result.costApproachValue).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/appraise-repo && npx vitest run server/costApproachCalculator.test.ts 2>&1 | tail -20
```
Expected: FAIL — "Cannot find module './services/costApproachCalculator'"

- [ ] **Step 3: Implement the service**

```typescript
// server/services/costApproachCalculator.ts
import type { CostApproachData } from "./pdfGenerator";

const COST_PER_SF: Record<string, number> = {
  residential: 165,
  "single-family": 165,
  multi_family: 140,
  "multi-family": 140,
  commercial: 175,
  industrial: 90,
  agricultural: 75,
  land: 0,
};
const DEFAULT_COST_PER_SF = 150;

const ECONOMIC_LIFE: Record<string, number> = {
  residential: 75,
  "single-family": 75,
  multi_family: 60,
  "multi-family": 60,
  commercial: 50,
  industrial: 40,
  agricultural: 35,
};
const DEFAULT_ECONOMIC_LIFE = 60;

const LAND_RATIO: Record<string, number> = {
  commercial: 0.25,
  land: 1.0,
};
const DEFAULT_LAND_RATIO = 0.20;

export function computeReplacementCostPerSF(propertyType?: string | null): number {
  if (!propertyType) return DEFAULT_COST_PER_SF;
  const normalized = propertyType.toLowerCase().trim();
  return COST_PER_SF[normalized] ?? DEFAULT_COST_PER_SF;
}

export function computePhysicalDepreciation(
  replacementCostNew: number,
  chronologicalAge: number,
  propertyType?: string | null,
): number {
  const pt = propertyType?.toLowerCase().trim() ?? "";
  const econLife = ECONOMIC_LIFE[pt] ?? DEFAULT_ECONOMIC_LIFE;
  const depRate = Math.min(0.80, chronologicalAge / econLife);
  return Math.round(replacementCostNew * depRate);
}

export function estimateLandValue(params: {
  assessedValue?: number | null;
  estimatedValue?: number | null;
  propertyType?: string | null;
}): number {
  const { assessedValue, estimatedValue, propertyType } = params;
  const base = assessedValue ?? estimatedValue ?? 0;
  if (base <= 0) return 0;
  const pt = propertyType?.toLowerCase().trim() ?? "";
  const ratio = LAND_RATIO[pt] ?? DEFAULT_LAND_RATIO;
  return Math.round(base * ratio);
}

export function calculateCostApproach(params: {
  squareFeet?: number | null;
  yearBuilt?: number | null;
  assessedValue?: number | null;
  estimatedValue?: number | null;
  propertyType?: string | null;
}): CostApproachData {
  const { squareFeet, yearBuilt, assessedValue, estimatedValue, propertyType } = params;

  if (!squareFeet || squareFeet <= 0) {
    return {
      landValue: estimateLandValue({ assessedValue, estimatedValue, propertyType }),
      improvementValue: null,
      replacementCostNew: null,
      totalDepreciation: null,
      effectiveAge: null,
      remainingEconomicLife: null,
      costApproachValue: null,
    };
  }

  const costPerSF = computeReplacementCostPerSF(propertyType);
  const replacementCostNew = Math.round(squareFeet * costPerSF);
  const currentYear = new Date().getFullYear();
  const chronologicalAge = yearBuilt ? Math.max(0, currentYear - yearBuilt) : 20;

  const pt = propertyType?.toLowerCase().trim() ?? "";
  const econLife = ECONOMIC_LIFE[pt] ?? DEFAULT_ECONOMIC_LIFE;
  const effectiveAge = Math.round(Math.min(chronologicalAge, econLife * 0.9));
  const remainingEconomicLife = Math.max(0, econLife - effectiveAge);

  const physicalDep = computePhysicalDepreciation(replacementCostNew, effectiveAge, propertyType);

  // Functional obsolescence
  const functionalDepRate = yearBuilt && yearBuilt < 1960 ? 0.05 : yearBuilt && yearBuilt < 1980 ? 0.02 : 0;
  const functionalDep = Math.round(replacementCostNew * functionalDepRate);

  const totalDepreciation = physicalDep + functionalDep;
  const improvementValue = Math.max(0, replacementCostNew - totalDepreciation);
  const landValue = estimateLandValue({ assessedValue, estimatedValue, propertyType });
  const costApproachValue = improvementValue + landValue;

  return {
    landValue,
    improvementValue,
    replacementCostNew,
    totalDepreciation,
    effectiveAge,
    remainingEconomicLife,
    costApproachValue,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
cd /home/user/appraise-repo && npx vitest run server/costApproachCalculator.test.ts 2>&1 | tail -20
```
Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
cd /home/user/appraise-repo && git add server/services/costApproachCalculator.ts server/costApproachCalculator.test.ts && git commit -m "feat: add cost approach calculator (replacement cost - depreciation + land)"
```

---

## Task 3: IncomeApproachCalculator

**Files:**
- Create: `server/services/incomeApproachCalculator.ts`
- Create: `server/incomeApproachCalculator.test.ts`

Computes the income capitalization approach: `NOI / Cap Rate = Income Value`. Also computes a GRM (Gross Rent Multiplier) cross-check.

**Methodology:**
- Uses `PropertyData.marketRent` (from RentCast) or `PropertyData.rentalComps` median to establish market rent per unit.
- **Total units:** for residential = 1, for multi-family use unit count from data (fall back to lotSize/squareFeet heuristic).
- **Gross potential income (GPI):** `marketRentPerUnit × units × 12`.
- **Vacancy rate:** 5% residential, 8% multi-family/commercial, 10% industrial.
- **Effective gross income (EGI):** `GPI × (1 - vacancyRate)`.
- **Operating expenses:** 35% of EGI for residential, 45% for multi-family/commercial, 40% industrial.
- **NOI:** `EGI - operatingExpenses`.
- **Cap rate:** from market data if available; otherwise 6% residential, 7% multi-family, 8% commercial, 9% industrial.
- **Income value:** `NOI / capRate`.

Only applies when `propertyType` is rental-eligible (not primary residential unless scenario = `rental_property`).

- [ ] **Step 1: Write failing test**

```typescript
// server/incomeApproachCalculator.test.ts
import { describe, it, expect } from "vitest";
import {
  calculateIncomeApproach,
  deriveMarketRent,
  computeVacancyRate,
} from "./services/incomeApproachCalculator";
import type { PropertyData } from "./services/propertyDataAggregator";

const baseData: Partial<PropertyData> = {
  marketRent: 2000,
  assessedValue: 400000,
};

describe("incomeApproachCalculator", () => {
  it("returns null when no rental data available", () => {
    const result = calculateIncomeApproach({}, "residential");
    expect(result).toBeNull();
  });

  it("derives market rent from marketRent field", () => {
    expect(deriveMarketRent({ marketRent: 2500 })).toBe(2500);
  });

  it("derives market rent from rentalComps median", () => {
    const data: Partial<PropertyData> = {
      rentalComps: [
        { address: "A", monthlyRent: 2000, bedrooms: 3, bathrooms: 2, squareFeet: 1500, source: "rentcast" },
        { address: "B", monthlyRent: 2400, bedrooms: 3, bathrooms: 2, squareFeet: 1500, source: "rentcast" },
        { address: "C", monthlyRent: 2200, bedrooms: 3, bathrooms: 2, squareFeet: 1500, source: "rentcast" },
      ],
    };
    expect(deriveMarketRent(data)).toBe(2200); // median of [2000, 2200, 2400]
  });

  it("computes vacancy rate by property type", () => {
    expect(computeVacancyRate("residential")).toBe(0.05);
    expect(computeVacancyRate("multi_family")).toBe(0.08);
    expect(computeVacancyRate("commercial")).toBe(0.08);
    expect(computeVacancyRate("industrial")).toBe(0.10);
  });

  it("calculates full income approach for rental property", () => {
    const result = calculateIncomeApproach(baseData as PropertyData, "rental_property");
    expect(result).not.toBeNull();
    expect(result!.marketRentPerUnit).toBe(2000);
    expect(result!.totalUnits).toBe(1);
    expect(result!.grossPotentialIncome).toBe(24000); // 2000 × 12
    expect(result!.vacancyRate).toBe(0.05);
    expect(result!.netOperatingIncome).toBeGreaterThan(0);
    expect(result!.incomeValue).toBeGreaterThan(0);
  });

  it("produces GRM-consistent income value", () => {
    // At cap rate 6%, NOI from $2k/mo rent: GPI=24000, EGI=22800, NOI=14820
    // income value = 14820 / 0.06 = 247,000
    const result = calculateIncomeApproach(baseData as PropertyData, "rental_property");
    expect(result!.incomeValue).toBeGreaterThan(100000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/appraise-repo && npx vitest run server/incomeApproachCalculator.test.ts 2>&1 | tail -20
```
Expected: FAIL — "Cannot find module './services/incomeApproachCalculator'"

- [ ] **Step 3: Implement the service**

```typescript
// server/services/incomeApproachCalculator.ts
import type { PropertyData, RentalComp } from "./propertyDataAggregator";
import type { IncomeApproachSummary } from "./pdfGenerator";

const VACANCY_RATES: Record<string, number> = {
  residential: 0.05,
  "single-family": 0.05,
  rental_property: 0.05,
  multi_family: 0.08,
  "multi-family": 0.08,
  commercial: 0.08,
  industrial: 0.10,
};
const DEFAULT_VACANCY = 0.07;

const EXPENSE_RATIOS: Record<string, number> = {
  residential: 0.35,
  "single-family": 0.35,
  rental_property: 0.35,
  multi_family: 0.45,
  "multi-family": 0.45,
  commercial: 0.45,
  industrial: 0.40,
};
const DEFAULT_EXPENSE_RATIO = 0.40;

const CAP_RATES: Record<string, number> = {
  residential: 0.06,
  "single-family": 0.06,
  rental_property: 0.06,
  multi_family: 0.07,
  "multi-family": 0.07,
  commercial: 0.08,
  industrial: 0.09,
};
const DEFAULT_CAP_RATE = 0.07;

const INCOME_SCENARIOS = new Set([
  "rental_property",
  "multi_family",
  "multi-family",
  "commercial",
  "industrial",
  "mixed_use",
]);

export function deriveMarketRent(data: Partial<PropertyData>): number | null {
  if (data.marketRent && data.marketRent > 0) return data.marketRent;
  const comps: RentalComp[] = data.rentalComps ?? [];
  if (comps.length === 0) return null;
  const rents = comps.map((c) => c.monthlyRent).filter((r) => r > 0).sort((a, b) => a - b);
  if (rents.length === 0) return null;
  const mid = Math.floor(rents.length / 2);
  return rents.length % 2 === 1 ? rents[mid] : (rents[mid - 1] + rents[mid]) / 2;
}

export function computeVacancyRate(scenario: string): number {
  const key = scenario.toLowerCase().trim();
  return VACANCY_RATES[key] ?? DEFAULT_VACANCY;
}

export function calculateIncomeApproach(
  data: Partial<PropertyData>,
  scenario: string,
): IncomeApproachSummary | null {
  if (!INCOME_SCENARIOS.has(scenario.toLowerCase().trim()) && !data.marketRent && !data.rentalComps?.length) {
    return null;
  }

  const marketRentPerUnit = deriveMarketRent(data);
  if (!marketRentPerUnit) return null;

  const totalUnits = Math.max(1, (data as any).unitCount ?? 1);
  const grossPotentialIncome = Math.round(marketRentPerUnit * totalUnits * 12);

  const key = scenario.toLowerCase().trim();
  const vacancyRate = VACANCY_RATES[key] ?? DEFAULT_VACANCY;
  const effectiveGrossIncome = Math.round(grossPotentialIncome * (1 - vacancyRate));

  const expenseRatio = EXPENSE_RATIOS[key] ?? DEFAULT_EXPENSE_RATIO;
  const operatingExpenses = Math.round(effectiveGrossIncome * expenseRatio);
  const netOperatingIncome = effectiveGrossIncome - operatingExpenses;

  const capRate = CAP_RATES[key] ?? DEFAULT_CAP_RATE;
  const incomeValue = netOperatingIncome > 0 ? Math.round(netOperatingIncome / capRate) : 0;

  return {
    marketRentPerUnit,
    totalUnits,
    grossPotentialIncome,
    vacancyRate,
    effectiveGrossIncome,
    operatingExpenses,
    netOperatingIncome,
    capRate,
    incomeValue,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
cd /home/user/appraise-repo && npx vitest run server/incomeApproachCalculator.test.ts 2>&1 | tail -20
```
Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
cd /home/user/appraise-repo && git add server/services/incomeApproachCalculator.ts server/incomeApproachCalculator.test.ts && git commit -m "feat: add income approach calculator (NOI/cap-rate)"
```

---

## Task 4: MarketTrendAnalyzer

**Files:**
- Create: `server/services/marketTrendAnalyzer.ts`
- Create: `server/marketTrendAnalyzer.test.ts`

Derives market condition statistics from the available comparable sales array.

**Metrics computed:**
- **medianSalePrice:** Median of all comp sale prices.
- **medianPricePerSF:** Median of `salePrice / squareFeet` for comps with valid SF.
- **averageDaysOnMarket:** Mean of `daysOnMarket` where present.
- **inventoryCount:** Count of comps in dataset.
- **priceChangeYoY:** Compares median price of comps sold in the last 12 months vs the prior 12 months. `null` if insufficient data.
- **absorptionRate:** `inventoryCount / 3` (months) — rough inventory absorption estimate. Returns `null` if fewer than 3 comps.

- [ ] **Step 1: Write failing test**

```typescript
// server/marketTrendAnalyzer.test.ts
import { describe, it, expect } from "vitest";
import { analyzeMarketTrends } from "./services/marketTrendAnalyzer";
import type { ComparableSale } from "./services/propertyDataAggregator";

const makeComp = (overrides: Partial<ComparableSale> = {}): ComparableSale => ({
  address: "123 Market St",
  salePrice: 300000,
  saleDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
  squareFeet: 1500,
  daysOnMarket: 30,
  similarity: 0.9,
  source: "redfin",
  ...overrides,
});

describe("marketTrendAnalyzer", () => {
  it("returns all null for empty comps array", () => {
    const result = analyzeMarketTrends([]);
    expect(result.medianSalePrice).toBeNull();
    expect(result.medianPricePerSF).toBeNull();
    expect(result.inventoryCount).toBeNull();
  });

  it("computes median sale price", () => {
    const comps = [
      makeComp({ salePrice: 250000 }),
      makeComp({ salePrice: 300000 }),
      makeComp({ salePrice: 400000 }),
    ];
    const result = analyzeMarketTrends(comps);
    expect(result.medianSalePrice).toBe(300000);
  });

  it("computes median price per SF", () => {
    const comps = [
      makeComp({ salePrice: 300000, squareFeet: 1500 }), // $200/SF
      makeComp({ salePrice: 400000, squareFeet: 2000 }), // $200/SF
    ];
    const result = analyzeMarketTrends(comps);
    expect(result.medianPricePerSF).toBeCloseTo(200, 0);
  });

  it("computes average days on market", () => {
    const comps = [
      makeComp({ daysOnMarket: 20 }),
      makeComp({ daysOnMarket: 40 }),
      makeComp({ daysOnMarket: 60 }),
    ];
    const result = analyzeMarketTrends(comps);
    expect(result.averageDaysOnMarket).toBe(40);
  });

  it("sets inventoryCount to number of comps", () => {
    const comps = [makeComp(), makeComp(), makeComp(), makeComp()];
    const result = analyzeMarketTrends(comps);
    expect(result.inventoryCount).toBe(4);
  });

  it("computes YoY price change when sufficient data", () => {
    const now = Date.now();
    const mo = (n: number) => new Date(now - n * 30 * 24 * 60 * 60 * 1000).toISOString();
    const comps = [
      makeComp({ salePrice: 300000, saleDate: mo(3) }),
      makeComp({ salePrice: 320000, saleDate: mo(6) }),
      makeComp({ salePrice: 280000, saleDate: mo(15) }),
      makeComp({ salePrice: 270000, saleDate: mo(20) }),
    ];
    const result = analyzeMarketTrends(comps);
    expect(result.priceChangeYoY).not.toBeNull();
    // Recent median ~310k vs prior ~275k → positive YoY
    expect(result.priceChangeYoY!).toBeGreaterThan(0);
  });

  it("returns null for priceChangeYoY when only one period has data", () => {
    const now = Date.now();
    const mo = (n: number) => new Date(now - n * 30 * 24 * 60 * 60 * 1000).toISOString();
    const comps = [makeComp({ saleDate: mo(2) }), makeComp({ saleDate: mo(4) })];
    const result = analyzeMarketTrends(comps);
    // No prior-12-month comps → null
    expect(result.priceChangeYoY).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/appraise-repo && npx vitest run server/marketTrendAnalyzer.test.ts 2>&1 | tail -20
```
Expected: FAIL — "Cannot find module './services/marketTrendAnalyzer'"

- [ ] **Step 3: Implement the service**

```typescript
// server/services/marketTrendAnalyzer.ts
import type { ComparableSale } from "./propertyDataAggregator";
import type { MarketTrendData } from "./pdfGenerator";

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function analyzeMarketTrends(comps: ComparableSale[]): MarketTrendData {
  if (comps.length === 0) {
    return {
      medianSalePrice: null,
      medianPricePerSF: null,
      averageDaysOnMarket: null,
      inventoryCount: null,
      priceChangeYoY: null,
      absorptionRate: null,
    };
  }

  const medianSalePrice = median(comps.map((c) => c.salePrice));
  const ppsf = comps
    .filter((c) => c.squareFeet > 0)
    .map((c) => c.salePrice / c.squareFeet);
  const medianPricePerSF = ppsf.length > 0 ? Math.round(median(ppsf)!) : null;

  const domValues = comps.filter((c) => c.daysOnMarket != null).map((c) => c.daysOnMarket!);
  const averageDaysOnMarket =
    domValues.length > 0 ? Math.round(domValues.reduce((a, b) => a + b, 0) / domValues.length) : null;

  const inventoryCount = comps.length;
  const absorptionRate = comps.length >= 3 ? Math.round((comps.length / 3) * 10) / 10 : null;

  // YoY: comps sold in last 12 months vs prior 12 months
  const now = Date.now();
  const twelveMonthsAgo = now - 365 * 24 * 60 * 60 * 1000;
  const twentyFourMonthsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000;

  const recentComps = comps.filter((c) => {
    const t = new Date(c.saleDate).getTime();
    return t >= twelveMonthsAgo;
  });
  const priorComps = comps.filter((c) => {
    const t = new Date(c.saleDate).getTime();
    return t >= twentyFourMonthsAgo && t < twelveMonthsAgo;
  });

  let priceChangeYoY: number | null = null;
  if (recentComps.length >= 2 && priorComps.length >= 2) {
    const recentMed = median(recentComps.map((c) => c.salePrice))!;
    const priorMed = median(priorComps.map((c) => c.salePrice))!;
    priceChangeYoY = Math.round(((recentMed - priorMed) / priorMed) * 1000) / 10; // % with 1 decimal
  }

  return {
    medianSalePrice: medianSalePrice ? Math.round(medianSalePrice) : null,
    medianPricePerSF,
    averageDaysOnMarket,
    inventoryCount,
    priceChangeYoY,
    absorptionRate,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
cd /home/user/appraise-repo && npx vitest run server/marketTrendAnalyzer.test.ts 2>&1 | tail -20
```
Expected: PASS — 7 tests pass

- [ ] **Step 5: Commit**

```bash
cd /home/user/appraise-repo && git add server/services/marketTrendAnalyzer.ts server/marketTrendAnalyzer.test.ts && git commit -m "feat: add market trend analyzer (median price, DOM, YoY change)"
```

---

## Task 5: Photo Cost-to-Cure Enhancement

**Files:**
- Modify: `server/services/photoAnalyzer.ts`
- Modify: `server/photo.test.ts` (add cost-to-cure tests)

Adds a `costToCureEstimate` (dollar amount) and `costToCureRange` (low/high) to `PhotoFinding`. This is derived from the LLM vision prompt that already analyzes photos — we add a request for dollar-range estimates for each `valueImpactingIssue`.

The LLM output schema gets a new optional field `costToCure?: { low: number; high: number; description: string }[]`. When present, sum the midpoints to produce a `costToCureTotal` field on `PhotoAnalysisSummary`.

- [ ] **Step 1: Read current PhotoFinding interface**

Read `server/services/photoAnalyzer.ts` lines 50–120 to understand the exact interface before modifying it.

- [ ] **Step 2: Write failing tests**

In `server/photo.test.ts`, add:

```typescript
describe("Photo cost-to-cure", () => {
  it("PhotoFinding includes costToCure field", () => {
    const finding = {
      url: "https://s3.example.com/photo.jpg",
      category: "exterior" as const,
      conditionScore: 40,
      conditionLabel: "fair" as const,
      observations: ["Roof shingles missing on south slope"],
      valueImpactingIssues: ["Missing shingles require replacement"],
      functionalObsolescence: [],
      assessorBlindSpots: [],
      costToCure: [{ low: 8000, high: 15000, description: "Roof shingle replacement" }],
    };
    expect(finding.costToCure).toBeDefined();
    expect(finding.costToCure![0].low).toBe(8000);
    expect(finding.costToCure![0].high).toBe(15000);
  });

  it("PhotoAnalysisSummary includes costToCureTotal", () => {
    const summary = {
      findings: [],
      overallConditionScore: 40,
      overallEvidenceStrength: "moderate" as const,
      appealStrengthDelta: 5,
      topObservations: [],
      topValueIssues: [],
      uspapRatings: [],
      assessorBlindSpotItems: [],
      functionalObsolescenceItems: [],
      summaryParagraph: "Test",
      costToCureTotal: 22000,
    };
    expect(summary.costToCureTotal).toBe(22000);
  });
});
```

Run: `npx vitest run server/photo.test.ts 2>&1 | tail -20`
Expected: FAIL (costToCure/costToCureTotal not on types yet)

- [ ] **Step 3: Add costToCure to PhotoFinding and PhotoAnalysisSummary**

In `server/services/photoAnalyzer.ts`, find the `PhotoFinding` interface and add after `assessorBlindSpots`:
```typescript
/** Dollar-range cost-to-cure estimates per value-impacting issue */
costToCure?: Array<{ low: number; high: number; description: string }>;
```

Find the `PhotoAnalysisSummary` interface and add:
```typescript
/** Sum of midpoint cost-to-cure estimates across all findings */
costToCureTotal?: number;
```

- [ ] **Step 4: Update the LLM response schema**

In `photoAnalyzer.ts`, find the JSON schema/prompt section where `PhotoFinding` fields are requested from the LLM and add:
```
"costToCure": [{"low": <number>, "high": <number>, "description": "<repair description>"}]
// Only include when a valueImpactingIssue has a clear repair cost (e.g. roof replacement $8k-$15k)
// Omit when cost is speculative or the issue is cosmetic only
```

- [ ] **Step 5: Aggregate costToCureTotal in the summary function**

In `photoAnalyzer.ts`, find the function that builds `PhotoAnalysisSummary` from findings. After building the summary object, add:
```typescript
const costToCureTotal = findings
  .flatMap((f) => f.costToCure ?? [])
  .reduce((sum, c) => sum + Math.round((c.low + c.high) / 2), 0);
if (costToCureTotal > 0) {
  summary.costToCureTotal = costToCureTotal;
}
```

- [ ] **Step 6: Run tests**

```bash
cd /home/user/appraise-repo && npx vitest run server/photo.test.ts 2>&1 | tail -20
```
Expected: PASS

- [ ] **Step 7: Run full test suite to check for regressions**

```bash
cd /home/user/appraise-repo && npx vitest run 2>&1 | tail -30
```
Expected: All tests pass (same count as before + new ones)

- [ ] **Step 8: Commit**

```bash
cd /home/user/appraise-repo && git add server/services/photoAnalyzer.ts server/photo.test.ts && git commit -m "feat: add cost-to-cure dollar estimates to photo analysis findings"
```

---

## Task 6: Pipeline Integration & Reconciliation Narrative

**Files:**
- Modify: `server/services/analysisJob.ts` (integrate all 4 calculators)
- Create: `server/services/reconciliationNarrative.ts` (LLM-generated narrative)
- Create: `server/reconciliationNarrative.test.ts`

This task wires all four new calculators into `analysisJob.ts` so the DB columns actually contain computed data, and generates a proper reconciliation narrative using Claude.

**Where to inject in analysisJob.ts:**
After the existing Step 4b (scenario adjustments, approx line 330), before the DB write (approx line 795). The calculators run in parallel via `Promise.all`.

**Reconciliation narrative:** Claude is given the three approach values (sales comparison = marketValueEstimate, cost approach value, income approach value if applicable), the scenario context, and the top appeal strength factors, and asked to write a 2-3 paragraph USPAP-style reconciliation explaining the final value opinion and approach weights.

- [ ] **Step 1: Write failing tests for reconciliation narrative**

```typescript
// server/reconciliationNarrative.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("./_core/claude", () => ({
  analyzeWithClaude: vi.fn().mockResolvedValue(
    "The Sales Comparison Approach is given primary weight of 85% as the market provides abundant, reliable evidence. " +
    "The Cost Approach, indicating $312,000, serves as a secondary check. " +
    "Final value opinion: $295,000."
  ),
  isClaudeAvailable: vi.fn().mockReturnValue(true),
}));

import { generateReconciliationNarrative } from "./services/reconciliationNarrative";

describe("reconciliationNarrative", () => {
  it("generates a narrative string", async () => {
    const result = await generateReconciliationNarrative({
      salesCompValue: 295000,
      costApproachValue: 312000,
      incomeApproachValue: null,
      assessedValue: 380000,
      propertyType: "residential",
      scenario: "primary_residence",
      appealStrengthFactors: ["Value gap: 19%", "3 supporting comparables"],
      approachWeights: { market: 0.85, cost: 0.15, income: 0 },
    });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(50);
  });

  it("returns a fallback narrative when Claude unavailable", async () => {
    const { isClaudeAvailable } = await import("./_core/claude");
    (isClaudeAvailable as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const result = await generateReconciliationNarrative({
      salesCompValue: 295000,
      costApproachValue: null,
      incomeApproachValue: null,
      assessedValue: 380000,
      propertyType: "residential",
      scenario: "primary_residence",
      appealStrengthFactors: [],
      approachWeights: { market: 1.0, cost: 0, income: 0 },
    });
    expect(typeof result).toBe("string");
    expect(result).toContain("295,000");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/user/appraise-repo && npx vitest run server/reconciliationNarrative.test.ts 2>&1 | tail -20
```
Expected: FAIL — "Cannot find module './services/reconciliationNarrative'"

- [ ] **Step 3: Create reconciliationNarrative.ts**

```typescript
// server/services/reconciliationNarrative.ts
import { analyzeWithClaude, isClaudeAvailable } from "../_core/claude";
import { scopedLogger } from "../_core/logger";

const log = scopedLogger("ReconciliationNarrative");

export interface ReconciliationInput {
  salesCompValue: number;
  costApproachValue: number | null | undefined;
  incomeApproachValue: number | null | undefined;
  assessedValue: number;
  propertyType: string;
  scenario: string;
  appealStrengthFactors: string[];
  approachWeights: { market: number; cost: number; income: number };
}

export async function generateReconciliationNarrative(input: ReconciliationInput): Promise<string> {
  if (!isClaudeAvailable()) {
    return buildFallbackNarrative(input);
  }

  const { salesCompValue, costApproachValue, incomeApproachValue, assessedValue,
    propertyType, appealStrengthFactors, approachWeights } = input;

  const approachLines = [
    `Sales Comparison Approach: $${salesCompValue.toLocaleString()} (weight: ${Math.round(approachWeights.market * 100)}%)`,
    costApproachValue ? `Cost Approach: $${costApproachValue.toLocaleString()} (weight: ${Math.round(approachWeights.cost * 100)}%)` : null,
    incomeApproachValue ? `Income Capitalization Approach: $${incomeApproachValue.toLocaleString()} (weight: ${Math.round(approachWeights.income * 100)}%)` : null,
  ].filter(Boolean).join("\n");

  const prompt =
    `You are a USPAP-compliant appraisal analyst. Write a 2-3 paragraph reconciliation section ` +
    `for a property tax appeal report. The subject is a ${propertyType} property currently assessed at ` +
    `$${assessedValue.toLocaleString()}.\n\n` +
    `Approach values:\n${approachLines}\n\n` +
    `Appeal strength factors: ${appealStrengthFactors.slice(0, 5).join("; ")}\n\n` +
    `Requirements:\n` +
    `- Explain why the Sales Comparison Approach is given primary weight\n` +
    `- Reference the cost and income approaches as supporting checks if applicable\n` +
    `- State the final value opinion clearly\n` +
    `- Professional, evidence-based tone — no emotional language\n` +
    `- Do NOT mention the appeal or the assessor's position directly\n` +
    `- Output plain text only, no markdown`;

  try {
    const text = await analyzeWithClaude(prompt, { maxTokens: 600, cachePrompt: true });
    return typeof text === "string" ? text.trim() : buildFallbackNarrative(input);
  } catch (err) {
    log.warn("Reconciliation narrative LLM call failed, using fallback", { err: (err as Error).message });
    return buildFallbackNarrative(input);
  }
}

function buildFallbackNarrative(input: ReconciliationInput): string {
  const { salesCompValue, costApproachValue, incomeApproachValue, approachWeights } = input;
  const approaches = [
    `The Sales Comparison Approach, given primary weight of ${Math.round(approachWeights.market * 100)}%, ` +
    `indicates a market value of $${salesCompValue.toLocaleString()} based on analysis of comparable sales ` +
    `transactions adjusted for time, size, condition, and other relevant characteristics.`,
  ];
  if (costApproachValue) {
    approaches.push(
      `The Cost Approach, weighted at ${Math.round(approachWeights.cost * 100)}%, indicates a value of ` +
      `$${costApproachValue.toLocaleString()} based on replacement cost new less estimated depreciation plus land value. ` +
      `This approach serves as a secondary indicator and is consistent with the sales comparison conclusion.`
    );
  }
  if (incomeApproachValue) {
    approaches.push(
      `The Income Capitalization Approach indicates a value of $${incomeApproachValue.toLocaleString()} ` +
      `based on the property's income-producing potential and market-derived capitalization rate.`
    );
  }
  approaches.push(
    `After considering all applicable approaches and giving greatest weight to the Sales Comparison Approach ` +
    `as the most reliable indicator of market value for this property type, the final opinion of market value is ` +
    `$${salesCompValue.toLocaleString()}.`
  );
  return approaches.join(" ");
}
```

- [ ] **Step 4: Run reconciliation tests**

```bash
cd /home/user/appraise-repo && npx vitest run server/reconciliationNarrative.test.ts 2>&1 | tail -20
```
Expected: PASS — 2 tests pass

- [ ] **Step 5: Wire calculators into analysisJob.ts**

In `server/services/analysisJob.ts`, add these imports at the top (after existing imports):
```typescript
import { buildAdjustmentGrid } from "./comparableSalesAnalyzer";
import { calculateCostApproach } from "./costApproachCalculator";
import { calculateIncomeApproach } from "./incomeApproachCalculator";
import { analyzeMarketTrends } from "./marketTrendAnalyzer";
import { generateReconciliationNarrative } from "./reconciliationNarrative";
```

In `analysisJob.ts`, find the block around line 786–825 where the DB write happens (the `createPropertyAnalysis` or `updatePropertyAnalysis` call with `adjustmentGrid`, `costApproachData`, `incomeApproachData`, `marketTrendData`, `reconciliationNarrative` fields).

BEFORE that block, add a parallel computation section. Find the line that starts the DB write (search for `adjustmentGrid: analysis.adjustmentGrid`) and insert BEFORE it:

```typescript
    // ── Step 5: Run advanced valuation calculators ───────────────────────────
    const [computedAdjGrid, computedCostApproach, computedIncomeApproach, computedMarketTrend] =
      await Promise.all([
        Promise.resolve(
          buildAdjustmentGrid(
            {
              squareFeet: propertyData.squareFeet,
              bedrooms: propertyData.bedrooms,
              bathrooms: propertyData.bathrooms,
              yearBuilt: propertyData.yearBuilt,
              lotSize: propertyData.lotSize,
            },
            propertyData.comparableSales ?? [],
            { excludeNonArmsLength: true },
          )
        ),
        Promise.resolve(
          calculateCostApproach({
            squareFeet: propertyData.squareFeet,
            yearBuilt: propertyData.yearBuilt,
            assessedValue: propertyData.assessedValue,
            estimatedValue: propertyData.estimatedValue,
            propertyType,
          })
        ),
        Promise.resolve(
          calculateIncomeApproach(propertyData, userScenario)
        ),
        Promise.resolve(
          analyzeMarketTrends(propertyData.comparableSales ?? [])
        ),
      ]);

    const computedReconciliation = await generateReconciliationNarrative({
      salesCompValue: scenarioAdjustedValue,
      costApproachValue: computedCostApproach.costApproachValue ?? null,
      incomeApproachValue: computedIncomeApproach?.incomeValue ?? null,
      assessedValue: propertyData.assessedValue ?? 0,
      propertyType,
      scenario: userScenario,
      appealStrengthFactors: analysis.appealStrengthFactors ?? [],
      approachWeights: {
        market: scenarioContext.valuationAdjustments.marketApproachWeight,
        cost: scenarioContext.valuationAdjustments.costApproachWeight,
        income: scenarioContext.valuationAdjustments.incomeApproachWeight,
      },
    }).catch((err) => {
      log.warn("Reconciliation narrative failed, using LLM justification", { submissionId, err: (err as Error).message });
      return analysis.valuationJustification ?? null;
    });
```

Then update the DB write to use computed values (find the lines with `adjustmentGrid: analysis.adjustmentGrid ? JSON.stringify(analysis.adjustmentGrid) : null` etc. and replace):

```typescript
        adjustmentGrid: computedAdjGrid.length > 0 ? JSON.stringify(computedAdjGrid) : (analysis.adjustmentGrid ? JSON.stringify(analysis.adjustmentGrid) : null),
        incomeApproachData: computedIncomeApproach ? JSON.stringify(computedIncomeApproach) : (analysis.incomeApproach ? JSON.stringify(analysis.incomeApproach) : null),
        costApproachData: JSON.stringify({
          ...computedCostApproach,
          costApproachValue: computedCostApproach.costApproachValue ?? (propertyData as any).costApproachValue ?? null,
        }),
        marketTrendData: JSON.stringify({
          ...computedMarketTrend,
          // Preserve any richer market data from the aggregator if present
          ...(Object.fromEntries(
            Object.entries((propertyData as any).marketTrendData ?? {}).filter(([, v]) => v != null)
          )),
        }),
        reconciliationNarrative: computedReconciliation ?? analysis.valuationJustification ?? null,
```

- [ ] **Step 6: Run full test suite**

```bash
cd /home/user/appraise-repo && npx vitest run 2>&1 | tail -40
```
Expected: All tests pass (0 failures, count ≥ previous + new tests)

- [ ] **Step 7: TypeScript check**

```bash
cd /home/user/appraise-repo && npx tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors

- [ ] **Step 8: Commit**

```bash
cd /home/user/appraise-repo && git add server/services/analysisJob.ts server/services/reconciliationNarrative.ts server/reconciliationNarrative.test.ts && git commit -m "feat: wire advanced calculators into analysis pipeline with reconciliation narrative"
```

---

## Final verification

- [ ] Run full test suite and verify all pass:

```bash
cd /home/user/appraise-repo && npx vitest run 2>&1 | tail -20
```

- [ ] TypeScript check:

```bash
cd /home/user/appraise-repo && npx tsc --noEmit 2>&1 | head -20
```

- [ ] Push branch:

```bash
cd /home/user/appraise-repo && git push origin claude/setup-superpowers-plugin-PAXr0
```
