/**
 * Market Trend Analyzer
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes market conditions and provides time adjustments for comparable sales:
 * - Market appreciation/depreciation rates
 * - Seasonal adjustments
 * - Market conditions (buyer/seller market, inventory, DOM)
 * - Supply/demand indicators
 */

export interface MarketTrendData {
  medianSalePrice?: number;
  medianPricePerSqft?: number;
  averageDaysOnMarket?: number;
  inventoryCount?: number;
  priceChangeYoY?: number;           // Year-over-year change (e.g., 0.05 for 5%)
  absorptionRate?: number;           // Months of inventory
  marketCondition?: "buyer" | "seller" | "balanced";
  appreciationRate?: number;         // Annual appreciation rate
  seasonalAdjustment?: number;       // Seasonal factor (e.g., 0.95 for 5% seasonal discount)
}

export interface MarketAnalysisResult {
  marketCondition: "buyer" | "seller" | "balanced";
  appreciationRate: number;
  seasonalAdjustment: number;
  marketStrength: number;            // 0-100 (50 = balanced)
  analysisNarrative: string;
  dataPoints: string[];
  recommendations: string[];
}

// ─── MARKET CONDITION BENCHMARKS ──────────────────────────────────────────────

// Months of inventory thresholds
const INVENTORY_THRESHOLDS = {
  buyerMarket: 6,      // >6 months = strong buyer's market
  balancedMarket: 5,   // 4-6 months = balanced
  sellerMarket: 4,     // <4 months = seller's market
};

// Days on market thresholds (residential)
const DOM_THRESHOLDS = {
  buyerMarket: 60,     // >60 days = buyer's market
  balancedMarket: 45,  // 30-60 days = balanced
  sellerMarket: 30,    // <30 days = seller's market
};

// ─── SEASONAL ADJUSTMENTS ─────────────────────────────────────────────────────
// Residential market seasonality (US average)

const SEASONAL_ADJUSTMENTS: Record<number, number> = {
  1: 0.95,   // January: 5% discount (winter, post-holidays)
  2: 0.96,   // February: 4% discount
  3: 0.98,   // March: 2% discount (spring starting)
  4: 1.00,   // April: baseline (spring peak)
  5: 1.02,   // May: 2% premium (peak season)
  6: 1.03,   // June: 3% premium (peak season)
  7: 1.02,   // July: 2% premium (summer)
  8: 1.01,   // August: 1% premium
  9: 0.99,   // September: 1% discount (back to school)
  10: 0.98,  // October: 2% discount
  11: 0.94,  // November: 6% discount (holidays)
  12: 0.92,  // December: 8% discount (holidays)
};

// ─── APPRECIATION RATE BENCHMARKS ──────────────────────────────────────────────
// National average appreciation rates by market condition

const APPRECIATION_RATES = {
  strongBuyer: 0.01,    // 1% annual (weak market)
  moderateBuyer: 0.02,  // 2% annual
  balanced: 0.035,      // 3.5% annual
  moderateSeller: 0.05, // 5% annual
  strongSeller: 0.07,   // 7% annual (strong market)
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

function getMarketCondition(
  inventoryMonths?: number,
  daysOnMarket?: number,
  priceChangeYoY?: number
): "buyer" | "seller" | "balanced" {
  let buyerScore = 0;
  let sellerScore = 0;
  
  // Inventory analysis
  if (inventoryMonths !== undefined) {
    if (inventoryMonths > INVENTORY_THRESHOLDS.buyerMarket) {
      buyerScore += 2;
    } else if (inventoryMonths < INVENTORY_THRESHOLDS.sellerMarket) {
      sellerScore += 2;
    }
  }
  
  // Days on market analysis
  if (daysOnMarket !== undefined) {
    if (daysOnMarket > DOM_THRESHOLDS.buyerMarket) {
      buyerScore += 2;
    } else if (daysOnMarket < DOM_THRESHOLDS.sellerMarket) {
      sellerScore += 2;
    }
  }
  
  // Price change analysis
  if (priceChangeYoY !== undefined) {
    if (priceChangeYoY < 0.02) {
      buyerScore += 1;
    } else if (priceChangeYoY > 0.05) {
      sellerScore += 1;
    }
  }
  
  if (sellerScore > buyerScore) return "seller";
  if (buyerScore > sellerScore) return "buyer";
  return "balanced";
}

function getAppreciationRate(marketCondition: "buyer" | "seller" | "balanced"): number {
  switch (marketCondition) {
    case "buyer":
      return APPRECIATION_RATES.moderateBuyer;
    case "seller":
      return APPRECIATION_RATES.moderateSeller;
    case "balanced":
    default:
      return APPRECIATION_RATES.balanced;
  }
}

function getSeasonalAdjustment(month?: number): number {
  if (!month || month < 1 || month > 12) {
    return 1.0; // No adjustment if month unknown
  }
  return SEASONAL_ADJUSTMENTS[month] || 1.0;
}

function calculateMarketStrength(marketCondition: "buyer" | "seller" | "balanced"): number {
  switch (marketCondition) {
    case "buyer":
      return 30;  // 0-50 = buyer's market
    case "seller":
      return 70;  // 50-100 = seller's market
    case "balanced":
    default:
      return 50;  // 50 = balanced
  }
}

// ─── MAIN ANALYSIS FUNCTION ────────────────────────────────────────────────────

export function analyzeMarketTrends(data: MarketTrendData): MarketAnalysisResult {
  const recommendations: string[] = [];
  const dataPoints: string[] = [];
  
  // Determine market condition
  const marketCondition = data.marketCondition || 
    getMarketCondition(data.absorptionRate, data.averageDaysOnMarket, data.priceChangeYoY);
  
  // Get appreciation rate
  const appreciationRate = data.appreciationRate ?? getAppreciationRate(marketCondition);
  
  // Get seasonal adjustment
  const currentMonth = new Date().getMonth() + 1;
  const seasonalAdjustment = data.seasonalAdjustment ?? getSeasonalAdjustment(currentMonth);
  
  // Calculate market strength
  const marketStrength = calculateMarketStrength(marketCondition);
  
  // Generate narrative
  const analysisNarrative = generateMarketNarrative(
    data,
    marketCondition,
    appreciationRate,
    seasonalAdjustment,
    marketStrength
  );
  
  // Data points
  if (data.medianSalePrice) {
    dataPoints.push(`Median Sale Price: $${data.medianSalePrice.toLocaleString()}`);
  }
  if (data.medianPricePerSqft) {
    dataPoints.push(`Median Price/Sq Ft: $${data.medianPricePerSqft.toFixed(2)}`);
  }
  if (data.averageDaysOnMarket) {
    dataPoints.push(`Average Days on Market: ${data.averageDaysOnMarket}`);
  }
  if (data.inventoryCount) {
    dataPoints.push(`Active Inventory: ${data.inventoryCount} properties`);
  }
  if (data.priceChangeYoY) {
    dataPoints.push(`Year-over-Year Price Change: ${(data.priceChangeYoY * 100).toFixed(1)}%`);
  }
  if (data.absorptionRate) {
    dataPoints.push(`Absorption Rate: ${data.absorptionRate.toFixed(1)} months`);
  }
  dataPoints.push(`Market Condition: ${marketCondition.charAt(0).toUpperCase() + marketCondition.slice(1)}'s Market`);
  dataPoints.push(`Annual Appreciation Rate: ${(appreciationRate * 100).toFixed(2)}%`);
  dataPoints.push(`Seasonal Adjustment: ${(seasonalAdjustment * 100).toFixed(1)}%`);
  
  // Recommendations
  if (marketCondition === "buyer") {
    recommendations.push("Strong buyer's market — comparable sales may reflect favorable buyer conditions");
    recommendations.push("Consider longer market exposure periods for time adjustments");
    recommendations.push("Apply conservative appreciation rates to recent sales");
  } else if (marketCondition === "seller") {
    recommendations.push("Strong seller's market — comparable sales reflect favorable seller conditions");
    recommendations.push("Apply higher appreciation rates to recent sales");
    recommendations.push("Expect faster absorption and shorter marketing periods");
  } else {
    recommendations.push("Balanced market — standard adjustment factors apply");
    recommendations.push("Market conditions support current valuation approaches");
  }
  
  return {
    marketCondition,
    appreciationRate,
    seasonalAdjustment,
    marketStrength,
    analysisNarrative,
    dataPoints,
    recommendations,
  };
}

// ─── NARRATIVE GENERATION ──────────────────────────────────────────────────────

function generateMarketNarrative(
  data: MarketTrendData,
  marketCondition: "buyer" | "seller" | "balanced",
  appreciationRate: number,
  seasonalAdjustment: number,
  marketStrength: number
): string {
  let narrative = `Market analysis indicates a ${marketCondition}'s market in this area. `;
  
  if (data.absorptionRate) {
    const condition = data.absorptionRate > 6 ? "strong buyer's" : data.absorptionRate < 4 ? "strong seller's" : "balanced";
    narrative += `With ${data.absorptionRate.toFixed(1)} months of inventory, the market is characterized as a ${condition} market. `;
  }
  
  if (data.averageDaysOnMarket) {
    narrative += `Properties average ${data.averageDaysOnMarket} days on market. `;
  }
  
  if (data.priceChangeYoY) {
    const direction = data.priceChangeYoY > 0 ? "appreciation" : "depreciation";
    narrative += `Year-over-year prices show ${direction} of ${Math.abs(data.priceChangeYoY * 100).toFixed(1)}%. `;
  }
  
  narrative += `The market appreciation rate is estimated at ${(appreciationRate * 100).toFixed(2)}% annually. `;
  
  if (seasonalAdjustment !== 1.0) {
    const adjustment = seasonalAdjustment > 1.0 ? "premium" : "discount";
    narrative += `Seasonal factors suggest a ${Math.abs((seasonalAdjustment - 1) * 100).toFixed(1)}% ${adjustment} for this time of year. `;
  }
  
  narrative += `These market conditions inform the time adjustments applied to comparable sales.`;
  
  return narrative.trim();
}

/**
 * Calculate time adjustment for a comparable sale
 * @param saleDate Date the comparable sold
 * @param appreciationRate Annual appreciation rate (e.g., 0.035 for 3.5%)
 * @returns Adjustment factor (e.g., 1.05 for 5% appreciation)
 */
export function calculateTimeAdjustment(saleDate: Date, appreciationRate: number): number {
  const now = new Date();
  const monthsAgo = (now.getFullYear() - saleDate.getFullYear()) * 12 + 
                    (now.getMonth() - saleDate.getMonth());
  const yearsAgo = monthsAgo / 12;
  
  // Compound appreciation
  return Math.pow(1 + appreciationRate, yearsAgo);
}

/**
 * Calculate combined time and seasonal adjustment
 */
export function calculateCombinedTimeSeasonalAdjustment(
  saleDate: Date,
  appreciationRate: number,
  saleMonth?: number
): number {
  const timeAdjustment = calculateTimeAdjustment(saleDate, appreciationRate);
  const seasonalAdjustment = getSeasonalAdjustment(saleMonth);
  
  return timeAdjustment * seasonalAdjustment;
}
