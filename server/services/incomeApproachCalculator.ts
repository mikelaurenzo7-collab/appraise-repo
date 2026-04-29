/**
 * Income Approach Calculator
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements the Income Approach per USPAP standards:
 * Income Approach = Net Operating Income ÷ Capitalization Rate
 *
 * Suitable for income-producing properties:
 * - Rental residential (duplexes, triplexes, multifamily)
 * - Commercial (retail, office, industrial)
 * - Mixed-use properties
 */

export interface IncomeApproachInput {
  address: string;
  propertyType: string;
  annualGrossRentalIncome: number;
  vacancyRate?: number;           // Override benchmark (e.g., 0.07 for 7%)
  operatingExpenseRatio?: number; // Override benchmark (e.g., 0.40 for 40%)
  capitalizationRate?: number;    // Override benchmark (e.g., 0.065 for 6.5%)
  annualOperatingExpenses?: number; // Use actual if available
  grossRentMultiplier?: number;   // For GRM cross-check
  monthlyRent?: number;           // For GRM cross-check
}

export interface IncomeApproachResult {
  grossPotentialIncome: number;
  vacancyRate: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  operatingExpenseRatio: number;
  operatingExpenses: number;
  netOperatingIncome: number;
  capitalizationRate: number;
  incomeApproachValue: number;
  grmCrossCheckValue?: number;
  reconciledValue: number;
  confidence: number; // 0-100
  analysisNarrative: string;
  dataPoints: string[];
  warnings: string[];
}

// ─── BENCHMARK CAP RATES ──────────────────────────────────────────────────────

const CAPITALIZATION_RATES: Record<string, number> = {
  sfr: 0.055,
  condo: 0.055,
  townhome: 0.055,
  "co-op": 0.055,
  manufactured: 0.075,
  modular: 0.065,
  duplex: 0.065,
  triplex: 0.068,
  quadplex: 0.070,
  "small-multifamily": 0.075,
  "large-multifamily": 0.055,
  "multi-family": 0.068,
  retail: 0.065,
  office: 0.070,
  industrial: 0.055,
  "mixed-use": 0.065,
  hospitality: 0.085,
  agricultural: 0.040,
  "vacant-land": 0.030,
  "special-purpose": 0.080,
  "excess-land": 0.030,
  residential: 0.060,
  commercial: 0.068,
};

// ─── BENCHMARK VACANCY RATES ──────────────────────────────────────────────────

const VACANCY_RATES: Record<string, number> = {
  sfr: 0.05,
  condo: 0.05,
  townhome: 0.05,
  "co-op": 0.03,
  manufactured: 0.07,
  modular: 0.05,
  duplex: 0.05,
  triplex: 0.06,
  quadplex: 0.06,
  "small-multifamily": 0.07,
  "large-multifamily": 0.08,
  "multi-family": 0.07,
  retail: 0.10,
  office: 0.12,
  industrial: 0.06,
  "mixed-use": 0.08,
  hospitality: 0.30,
  agricultural: 0.02,
  "vacant-land": 0.00,
  "special-purpose": 0.05,
  "excess-land": 0.00,
  residential: 0.05,
  commercial: 0.10,
};

// ─── BENCHMARK OPERATING EXPENSE RATIOS ──────────────────────────────────────

const OPERATING_EXPENSE_RATIOS: Record<string, number> = {
  sfr: 0.30,
  condo: 0.35,
  townhome: 0.32,
  "co-op": 0.40,
  manufactured: 0.30,
  modular: 0.30,
  duplex: 0.35,
  triplex: 0.38,
  quadplex: 0.40,
  "small-multifamily": 0.42,
  "large-multifamily": 0.45,
  "multi-family": 0.40,
  retail: 0.35,
  office: 0.40,
  industrial: 0.30,
  "mixed-use": 0.40,
  hospitality: 0.60,
  agricultural: 0.25,
  "vacant-land": 0.05,
  "special-purpose": 0.45,
  "excess-land": 0.05,
  residential: 0.32,
  commercial: 0.40,
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

function normalizePropertyType(raw: string): string {
  const t = raw.toLowerCase().trim();
  if (t.includes("sfr") || t.includes("single family")) return "sfr";
  if (t.includes("condo")) return "condo";
  if (t.includes("townhome")) return "townhome";
  if (t.includes("duplex")) return "duplex";
  if (t.includes("triplex")) return "triplex";
  if (t.includes("quadplex")) return "quadplex";
  if (t.includes("small multi")) return "small-multifamily";
  if (t.includes("large multi")) return "large-multifamily";
  if (t.includes("multi") || t.includes("apartment")) return "multi-family";
  if (t.includes("retail")) return "retail";
  if (t.includes("office")) return "office";
  if (t.includes("industrial")) return "industrial";
  if (t.includes("mixed")) return "mixed-use";
  if (t.includes("commercial")) return "commercial";
  return "residential";
}

function getCapitalizationRate(propertyType: string): number {
  const normalized = normalizePropertyType(propertyType);
  return CAPITALIZATION_RATES[normalized] || CAPITALIZATION_RATES.residential;
}

function getVacancyRate(propertyType: string): number {
  const normalized = normalizePropertyType(propertyType);
  return VACANCY_RATES[normalized] || VACANCY_RATES.residential;
}

function getOperatingExpenseRatio(propertyType: string): number {
  const normalized = normalizePropertyType(propertyType);
  return OPERATING_EXPENSE_RATIOS[normalized] || OPERATING_EXPENSE_RATIOS.residential;
}

// ─── MAIN CALCULATION FUNCTION ─────────────────────────────────────────────────

export function calculateIncomeApproach(input: IncomeApproachInput): IncomeApproachResult {
  const warnings: string[] = [];
  const dataPoints: string[] = [];
  
  // Get benchmarks
  const vacancyRate = input.vacancyRate ?? getVacancyRate(input.propertyType);
  const operatingExpenseRatio = input.operatingExpenseRatio ?? getOperatingExpenseRatio(input.propertyType);
  const capitalizationRate = input.capitalizationRate ?? getCapitalizationRate(input.propertyType);
  
  // Step 1: Calculate Effective Gross Income
  const grossPotentialIncome = input.annualGrossRentalIncome;
  const vacancyLoss = Math.round(grossPotentialIncome * vacancyRate);
  const effectiveGrossIncome = grossPotentialIncome - vacancyLoss;
  
  // Step 2: Calculate Operating Expenses
  const operatingExpenses = input.annualOperatingExpenses ?? 
    Math.round(effectiveGrossIncome * operatingExpenseRatio);
  
  // Step 3: Calculate Net Operating Income
  const netOperatingIncome = effectiveGrossIncome - operatingExpenses;
  
  if (netOperatingIncome <= 0) {
    warnings.push("Net Operating Income is zero or negative — income approach not applicable");
    return {
      grossPotentialIncome,
      vacancyRate,
      vacancyLoss,
      effectiveGrossIncome,
      operatingExpenseRatio,
      operatingExpenses,
      netOperatingIncome,
      capitalizationRate,
      incomeApproachValue: 0,
      reconciledValue: 0,
      confidence: 0,
      analysisNarrative: "Income approach not applicable — property does not generate sufficient income.",
      dataPoints: ["NOI is zero or negative"],
      warnings,
    };
  }
  
  // Step 4: Calculate Income Approach Value (Direct Capitalization)
  const incomeApproachValue = Math.round(netOperatingIncome / capitalizationRate);
  
  // Step 5: GRM Cross-Check (if available)
  let grmCrossCheckValue: number | undefined;
  let reconciledValue = incomeApproachValue;
  
  if (input.monthlyRent && input.grossRentMultiplier) {
    grmCrossCheckValue = Math.round(input.monthlyRent * 12 * input.grossRentMultiplier);
    
    // Reconcile: weight direct cap 80%, GRM 20%
    reconciledValue = Math.round(incomeApproachValue * 0.80 + grmCrossCheckValue * 0.20);
    
    dataPoints.push(`GRM Cross-Check: $${(input.monthlyRent * 12).toLocaleString()} annual rent × ${input.grossRentMultiplier} GRM = $${grmCrossCheckValue.toLocaleString()}`);
  }
  
  // Calculate confidence
  let confidence = 70; // Base confidence for income approach
  
  if (input.annualOperatingExpenses) {
    confidence += 15; // Higher confidence with actual expense data
  }
  
  if (input.grossRentMultiplier && grmCrossCheckValue) {
    confidence += 10; // Higher confidence with GRM cross-check
  }
  
  if (vacancyRate <= 0.08) {
    confidence += 5; // Healthy vacancy rate
  }
  
  confidence = Math.min(100, Math.max(0, confidence));
  
  // Generate narrative
  const analysisNarrative = generateIncomeApproachNarrative(
    input,
    grossPotentialIncome,
    vacancyRate,
    vacancyLoss,
    effectiveGrossIncome,
    operatingExpenseRatio,
    operatingExpenses,
    netOperatingIncome,
    capitalizationRate,
    incomeApproachValue,
    grmCrossCheckValue,
    reconciledValue
  );
  
  // Data points
  dataPoints.push(`Gross Potential Income: $${grossPotentialIncome.toLocaleString()}`);
  dataPoints.push(`Vacancy Rate: ${(vacancyRate * 100).toFixed(1)}%`);
  dataPoints.push(`Vacancy Loss: $${vacancyLoss.toLocaleString()}`);
  dataPoints.push(`Effective Gross Income: $${effectiveGrossIncome.toLocaleString()}`);
  dataPoints.push(`Operating Expense Ratio: ${(operatingExpenseRatio * 100).toFixed(1)}%`);
  dataPoints.push(`Operating Expenses: $${operatingExpenses.toLocaleString()}`);
  dataPoints.push(`Net Operating Income: $${netOperatingIncome.toLocaleString()}`);
  dataPoints.push(`Capitalization Rate: ${(capitalizationRate * 100).toFixed(2)}%`);
  dataPoints.push(`Income Approach Value: $${incomeApproachValue.toLocaleString()}`);
  if (grmCrossCheckValue) {
    dataPoints.push(`Reconciled Value: $${reconciledValue.toLocaleString()}`);
  }
  dataPoints.push(`Confidence Level: ${confidence}%`);
  
  return {
    grossPotentialIncome,
    vacancyRate,
    vacancyLoss,
    effectiveGrossIncome,
    operatingExpenseRatio,
    operatingExpenses,
    netOperatingIncome,
    capitalizationRate,
    incomeApproachValue,
    grmCrossCheckValue,
    reconciledValue,
    confidence,
    analysisNarrative,
    dataPoints,
    warnings,
  };
}

// ─── NARRATIVE GENERATION ──────────────────────────────────────────────────────

function generateIncomeApproachNarrative(
  input: IncomeApproachInput,
  grossPotentialIncome: number,
  vacancyRate: number,
  vacancyLoss: number,
  effectiveGrossIncome: number,
  operatingExpenseRatio: number,
  operatingExpenses: number,
  netOperatingIncome: number,
  capitalizationRate: number,
  incomeApproachValue: number,
  grmCrossCheckValue: number | undefined,
  reconciledValue: number
): string {
  let narrative = `The Income Approach is applicable to this ${input.propertyType} property as it generates rental income. `;
  
  narrative += `The gross potential annual rental income is $${grossPotentialIncome.toLocaleString()}. `;
  
  narrative += `Applying a vacancy rate of ${(vacancyRate * 100).toFixed(1)}% results in a vacancy loss of $${vacancyLoss.toLocaleString()}, yielding an effective gross income of $${effectiveGrossIncome.toLocaleString()}. `;
  
  narrative += `Operating expenses are estimated at ${(operatingExpenseRatio * 100).toFixed(1)}% of effective gross income, totaling $${operatingExpenses.toLocaleString()}. `;
  
  narrative += `This results in a net operating income of $${netOperatingIncome.toLocaleString()}. `;
  
  narrative += `Using a market-derived capitalization rate of ${(capitalizationRate * 100).toFixed(2)}%, the income approach indicates a value of $${incomeApproachValue.toLocaleString()}. `;
  
  if (grmCrossCheckValue) {
    narrative += `A Gross Rent Multiplier cross-check supports this conclusion with an indicated value of $${grmCrossCheckValue.toLocaleString()}. `;
    narrative += `Reconciling these two methods yields a final income approach value of $${reconciledValue.toLocaleString()}.`;
  }
  
  return narrative.trim();
}
