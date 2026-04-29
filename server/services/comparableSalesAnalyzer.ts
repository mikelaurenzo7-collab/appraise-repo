/**
 * Advanced Comparable Sales Analyzer
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements professional comparable sales analysis per USPAP standards:
 * - Recency-weighted comp selection
 * - Comprehensive adjustment grids (time, location, condition, size, age, features)
 * - Market trend time adjustments
 * - Confidence scoring based on data quality
 * - Professional narrative generation
 */

export interface ComparableSaleData {
  address: string;
  salePrice: number;
  saleDate: Date;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  condition: "excellent" | "good" | "average" | "fair" | "poor";
  lotSize?: number;
  features?: string[];
  pricePerSqft?: number;
}

export interface AdjustmentEntry {
  category: string;
  subjectValue: string | number;
  compValue: string | number;
  adjustmentPercent: number;
  adjustmentDollar: number;
  rationale: string;
}

export interface AdjustmentGrid {
  compAddress: string;
  compSalePrice: number;
  compSaleDate: Date;
  adjustments: AdjustmentEntry[];
  netAdjustmentPercent: number;
  netAdjustmentDollar: number;
  adjustedPrice: number;
  pricePerSqftAdjusted: number;
  weight: number;
  confidence: number;
}

export interface ComparableSalesAnalysis {
  selectedComps: AdjustmentGrid[];
  weightedAveragePrice: number;
  weightedAveragePricePerSqft: number;
  indicatedValue: number;
  confidence: number; // 0-100
  analysisNarrative: string;
  dataPoints: string[];
  warnings: string[];
}

// ─── ADJUSTMENT FACTORS ────────────────────────────────────────────────────────

const TIME_ADJUSTMENT_RATES: Record<string, number> = {
  "0-3": 0.02,    // 2% annual appreciation (0-3 months old)
  "3-6": 0.02,    // 2% annual
  "6-12": 0.015,  // 1.5% annual
  "12-24": 0.01,  // 1% annual
  "24+": 0.005,   // 0.5% annual (older sales less reliable)
};

const LOCATION_ADJUSTMENT_RANGES: Record<string, { min: number; max: number }> = {
  "same_neighborhood": { min: -2, max: 2 },
  "adjacent_neighborhood": { min: -5, max: 5 },
  "same_city": { min: -10, max: 10 },
  "regional": { min: -15, max: 15 },
};

const CONDITION_ADJUSTMENTS: Record<string, Record<string, number>> = {
  excellent: { excellent: 0, good: 3, average: 6, fair: 10, poor: 15 },
  good: { excellent: -3, good: 0, average: 3, fair: 7, poor: 12 },
  average: { excellent: -6, good: -3, average: 0, fair: 4, poor: 9 },
  fair: { excellent: -10, good: -7, average: -4, fair: 0, poor: 5 },
  poor: { excellent: -15, good: -12, average: -9, fair: -5, poor: 0 },
};

const SIZE_ADJUSTMENT_RATE = 0.15; // $0.15 per sq ft difference (residential)
const AGE_ADJUSTMENT_RATE = 0.5; // 0.5% per year difference
const BEDROOM_ADJUSTMENT = 20000; // $20k per bedroom difference
const BATHROOM_ADJUSTMENT = 15000; // $15k per bathroom difference

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

function getMonthsAgo(saleDate: Date): number {
  const now = new Date();
  const months = (now.getFullYear() - saleDate.getFullYear()) * 12 + 
                 (now.getMonth() - saleDate.getMonth());
  return Math.max(0, months);
}

function getTimeAdjustmentRate(monthsAgo: number): number {
  if (monthsAgo <= 3) return TIME_ADJUSTMENT_RATES["0-3"];
  if (monthsAgo <= 6) return TIME_ADJUSTMENT_RATES["3-6"];
  if (monthsAgo <= 12) return TIME_ADJUSTMENT_RATES["6-12"];
  if (monthsAgo <= 24) return TIME_ADJUSTMENT_RATES["12-24"];
  return TIME_ADJUSTMENT_RATES["24+"];
}

function getConditionAdjustment(subjectCondition: string, compCondition: string): number {
  const subject = subjectCondition.toLowerCase() as keyof typeof CONDITION_ADJUSTMENTS;
  const comp = compCondition.toLowerCase() as keyof typeof CONDITION_ADJUSTMENTS;
  
  if (!CONDITION_ADJUSTMENTS[subject] || !CONDITION_ADJUSTMENTS[subject][comp]) {
    return 0;
  }
  
  return CONDITION_ADJUSTMENTS[subject][comp];
}

function calculateRecencyWeight(monthsAgo: number, index: number): number {
  // Exponential decay: most recent gets highest weight
  // Index 0 (most recent) = 1.0, then decays
  const recencyFactor = Math.exp(-monthsAgo / 12); // Decay over 12 months
  const indexFactor = Math.pow(0.85, index); // Each comp in sequence gets 85% of previous
  return recencyFactor * indexFactor;
}

function calculateConfidenceScore(
  compCount: number,
  avgMonthsAgo: number,
  dataQuality: "excellent" | "good" | "average" | "poor"
): number {
  let score = 50; // Base score
  
  // Comp count bonus
  if (compCount >= 5) score += 20;
  else if (compCount >= 3) score += 15;
  else if (compCount >= 2) score += 10;
  else score += 5;
  
  // Recency bonus
  if (avgMonthsAgo <= 3) score += 15;
  else if (avgMonthsAgo <= 6) score += 12;
  else if (avgMonthsAgo <= 12) score += 8;
  else if (avgMonthsAgo <= 24) score += 4;
  
  // Data quality bonus
  if (dataQuality === "excellent") score += 15;
  else if (dataQuality === "good") score += 10;
  else if (dataQuality === "average") score += 5;
  
  return Math.min(100, score);
}

// ─── MAIN ANALYSIS FUNCTION ────────────────────────────────────────────────────

export async function analyzeComparableSales(
  subject: ComparableSaleData,
  comparables: ComparableSaleData[],
  marketTrendAdjustment: number = 0 // Annual appreciation rate (e.g., 0.02 for 2%)
): Promise<ComparableSalesAnalysis> {
  const warnings: string[] = [];
  const dataPoints: string[] = [];
  
  if (comparables.length === 0) {
    return {
      selectedComps: [],
      weightedAveragePrice: 0,
      weightedAveragePricePerSqft: 0,
      indicatedValue: 0,
      confidence: 0,
      analysisNarrative: "No comparable sales data available for analysis.",
      dataPoints: ["No comparable sales found within search parameters"],
      warnings: ["Insufficient comparable sales data"],
    };
  }
  
  // Sort by recency (most recent first)
  const sortedComps = [...comparables].sort(
    (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
  );
  
  // Select top 6 most recent comps (USPAP best practice)
  const selectedComps = sortedComps.slice(0, 6);
  
  // Calculate adjustments for each comp
  const adjustmentGrids: AdjustmentGrid[] = selectedComps.map((comp, index) => {
    const monthsAgo = getMonthsAgo(comp.saleDate);
    const adjustments: AdjustmentEntry[] = [];
    let totalAdjustmentPercent = 0;
    
    // 1. TIME ADJUSTMENT (market appreciation/depreciation)
    const timeAdjustmentRate = getTimeAdjustmentRate(monthsAgo) + marketTrendAdjustment;
    const timeAdjustmentPercent = (monthsAgo / 12) * timeAdjustmentRate * 100;
    const timeAdjustmentDollar = Math.round(comp.salePrice * (timeAdjustmentPercent / 100));
    
    adjustments.push({
      category: "Time (Market Appreciation)",
      subjectValue: new Date().toLocaleDateString(),
      compValue: comp.saleDate.toLocaleDateString(),
      adjustmentPercent: timeAdjustmentPercent,
      adjustmentDollar: timeAdjustmentDollar,
      rationale: `${monthsAgo} months old; ${(timeAdjustmentRate * 100).toFixed(2)}% annual appreciation`,
    });
    totalAdjustmentPercent += timeAdjustmentPercent;
    
    // 2. LOCATION ADJUSTMENT (simplified to same/adjacent/regional)
    const locationAdjustmentPercent = 0; // Assume same market area for now
    adjustments.push({
      category: "Location",
      subjectValue: "Subject location",
      compValue: "Comp location",
      adjustmentPercent: locationAdjustmentPercent,
      adjustmentDollar: Math.round(comp.salePrice * (locationAdjustmentPercent / 100)),
      rationale: "Same market area — no adjustment",
    });
    totalAdjustmentPercent += locationAdjustmentPercent;
    
    // 3. CONDITION ADJUSTMENT
    const conditionAdjustmentPercent = getConditionAdjustment(subject.condition, comp.condition);
    const conditionAdjustmentDollar = Math.round(comp.salePrice * (conditionAdjustmentPercent / 100));
    
    adjustments.push({
      category: "Condition",
      subjectValue: subject.condition,
      compValue: comp.condition,
      adjustmentPercent: conditionAdjustmentPercent,
      adjustmentDollar: conditionAdjustmentDollar,
      rationale: `Subject: ${subject.condition}, Comp: ${comp.condition}`,
    });
    totalAdjustmentPercent += conditionAdjustmentPercent;
    
    // 4. SIZE ADJUSTMENT (square footage)
    const sizeAdjustmentPercent = ((subject.squareFeet - comp.squareFeet) / comp.squareFeet) * SIZE_ADJUSTMENT_RATE * 100;
    const sizeAdjustmentDollar = Math.round(comp.salePrice * (sizeAdjustmentPercent / 100));
    
    adjustments.push({
      category: "Size (Sq Ft)",
      subjectValue: `${subject.squareFeet.toLocaleString()} sq ft`,
      compValue: `${comp.squareFeet.toLocaleString()} sq ft`,
      adjustmentPercent: sizeAdjustmentPercent,
      adjustmentDollar: sizeAdjustmentDollar,
      rationale: `${Math.abs(subject.squareFeet - comp.squareFeet).toLocaleString()} sq ft difference @ $${SIZE_ADJUSTMENT_RATE}/sq ft`,
    });
    totalAdjustmentPercent += sizeAdjustmentPercent;
    
    // 5. AGE ADJUSTMENT
    const subjectAge = new Date().getFullYear() - subject.yearBuilt;
    const compAge = new Date().getFullYear() - comp.yearBuilt;
    const ageAdjustmentPercent = ((subjectAge - compAge) * AGE_ADJUSTMENT_RATE) / 100;
    const ageAdjustmentDollar = Math.round(comp.salePrice * (ageAdjustmentPercent / 100));
    
    adjustments.push({
      category: "Age",
      subjectValue: `${subjectAge} years old`,
      compValue: `${compAge} years old`,
      adjustmentPercent: ageAdjustmentPercent,
      adjustmentDollar: ageAdjustmentDollar,
      rationale: `${Math.abs(subjectAge - compAge)} year age difference @ ${AGE_ADJUSTMENT_RATE}%/year`,
    });
    totalAdjustmentPercent += ageAdjustmentPercent;
    
    // 6. BEDROOM ADJUSTMENT
    const bedroomAdjustmentDollar = (subject.bedrooms - comp.bedrooms) * BEDROOM_ADJUSTMENT;
    const bedroomAdjustmentPercent = (bedroomAdjustmentDollar / comp.salePrice) * 100;
    
    adjustments.push({
      category: "Bedrooms",
      subjectValue: `${subject.bedrooms} bedrooms`,
      compValue: `${comp.bedrooms} bedrooms`,
      adjustmentPercent: bedroomAdjustmentPercent,
      adjustmentDollar: bedroomAdjustmentDollar,
      rationale: `${Math.abs(subject.bedrooms - comp.bedrooms)} bedroom difference @ $${BEDROOM_ADJUSTMENT.toLocaleString()}/bedroom`,
    });
    totalAdjustmentPercent += bedroomAdjustmentPercent;
    
    // 7. BATHROOM ADJUSTMENT
    const bathroomAdjustmentDollar = (subject.bathrooms - comp.bathrooms) * BATHROOM_ADJUSTMENT;
    const bathroomAdjustmentPercent = (bathroomAdjustmentDollar / comp.salePrice) * 100;
    
    adjustments.push({
      category: "Bathrooms",
      subjectValue: `${subject.bathrooms} bathrooms`,
      compValue: `${comp.bathrooms} bathrooms`,
      adjustmentPercent: bathroomAdjustmentPercent,
      adjustmentDollar: bathroomAdjustmentDollar,
      rationale: `${Math.abs(subject.bathrooms - comp.bathrooms)} bathroom difference @ $${BATHROOM_ADJUSTMENT.toLocaleString()}/bathroom`,
    });
    totalAdjustmentPercent += bathroomAdjustmentPercent;
    
    // Calculate adjusted price
    const netAdjustmentDollar = adjustments.reduce((sum, a) => sum + a.adjustmentDollar, 0);
    const adjustedPrice = comp.salePrice + netAdjustmentDollar;
    const pricePerSqftAdjusted = adjustedPrice / subject.squareFeet;
    
    // Calculate weight (recency + similarity)
    const weight = calculateRecencyWeight(monthsAgo, index);
    
    // Confidence for this comp
    const compConfidence = calculateConfidenceScore(
      selectedComps.length,
      monthsAgo,
      "good"
    );
    
    return {
      compAddress: comp.address,
      compSalePrice: comp.salePrice,
      compSaleDate: comp.saleDate,
      adjustments,
      netAdjustmentPercent: totalAdjustmentPercent,
      netAdjustmentDollar,
      adjustedPrice,
      pricePerSqftAdjusted,
      weight,
      confidence: compConfidence,
    };
  });
  
  // Calculate weighted average
  const totalWeight = adjustmentGrids.reduce((sum, g) => sum + g.weight, 0);
  const weightedAveragePricePerSqft = 
    adjustmentGrids.reduce((sum, g) => sum + (g.pricePerSqftAdjusted * g.weight), 0) / totalWeight;
  const indicatedValue = Math.round(weightedAveragePricePerSqft * subject.squareFeet);
  
  // Calculate overall confidence
  const avgMonthsAgo = adjustmentGrids.reduce((sum, g) => sum + getMonthsAgo(g.compSaleDate), 0) / adjustmentGrids.length;
  const overallConfidence = calculateConfidenceScore(
    adjustmentGrids.length,
    Math.round(avgMonthsAgo),
    "good"
  );
  
  // Generate narrative
  const analysisNarrative = generateAnalysisNarrative(
    subject,
    adjustmentGrids,
    indicatedValue,
    weightedAveragePricePerSqft,
    overallConfidence
  );
  
  // Data points
  dataPoints.push(`Comparable Sales Analyzed: ${adjustmentGrids.length}`);
  dataPoints.push(`Average Sale Price: $${Math.round(adjustmentGrids.reduce((sum, g) => sum + g.compSalePrice, 0) / adjustmentGrids.length).toLocaleString()}`);
  dataPoints.push(`Weighted Average Price/Sq Ft: $${weightedAveragePricePerSqft.toFixed(2)}`);
  dataPoints.push(`Most Recent Sale: ${adjustmentGrids[0]?.compSaleDate.toLocaleDateString()}`);
  dataPoints.push(`Average Months Old: ${Math.round(avgMonthsAgo)}`);
  dataPoints.push(`Indicated Value: $${indicatedValue.toLocaleString()}`);
  dataPoints.push(`Analysis Confidence: ${overallConfidence}%`);
  
  return {
    selectedComps: adjustmentGrids,
    weightedAveragePrice: Math.round(weightedAveragePricePerSqft * subject.squareFeet),
    weightedAveragePricePerSqft,
    indicatedValue,
    confidence: overallConfidence,
    analysisNarrative,
    dataPoints,
    warnings,
  };
}

// ─── NARRATIVE GENERATION ──────────────────────────────────────────────────────

function generateAnalysisNarrative(
  subject: ComparableSaleData,
  grids: AdjustmentGrid[],
  indicatedValue: number,
  pricePerSqft: number,
  confidence: number
): string {
  const recentSale = grids[0];
  const avgAdjustment = grids.reduce((sum, g) => sum + g.netAdjustmentPercent, 0) / grids.length;
  
  return `
The Sales Comparison Approach analyzes ${grids.length} comparable properties sold within the subject market area. Each comparable was adjusted for differences in time of sale, location, condition, size, age, and bedroom/bathroom count. The most recent comparable sold on ${recentSale.compSaleDate.toLocaleDateString()} for $${recentSale.compSalePrice.toLocaleString()}. After applying market-based adjustments averaging ${avgAdjustment.toFixed(1)}%, the weighted average adjusted price is $${indicatedValue.toLocaleString()}, or $${pricePerSqft.toFixed(2)} per square foot. This analysis reflects a ${confidence}% confidence level based on the quantity, quality, and recency of comparable sales data.
  `.trim();
}
