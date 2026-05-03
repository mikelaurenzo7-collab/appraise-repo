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

  const userContent =
    `Write a reconciliation section for a property tax appeal report. ` +
    `The subject is a ${propertyType} property currently assessed at ` +
    `$${assessedValue.toLocaleString()}.\n\n` +
    `Approach values:\n${approachLines}\n\n` +
    `Appeal strength factors: ${appealStrengthFactors.slice(0, 5).join("; ")}\n\n` +
    `Requirements:\n` +
    `- Explain why the Sales Comparison Approach is given primary weight\n` +
    `- Reference cost and income approaches as supporting checks if applicable\n` +
    `- State the final value opinion clearly\n` +
    `- Professional, evidence-based tone — no emotional language\n` +
    `- Do NOT mention the appeal or the assessor's position directly\n` +
    `- Output plain text only, no markdown`;

  try {
    const text = await analyzeWithClaude({
      systemPrompt:
        `You are a USPAP-compliant appraisal analyst. Write a 2-3 paragraph reconciliation section ` +
        `for a property tax appeal report. Use professional, evidence-based language.`,
      userContent,
      maxTokens: 600,
    });
    return typeof text === "string" ? text.trim() : buildFallbackNarrative(input);
  } catch (err) {
    log.warn("Reconciliation narrative LLM call failed, using fallback", { err: (err as Error).message });
    return buildFallbackNarrative(input);
  }
}

function buildFallbackNarrative(input: ReconciliationInput): string {
  const { salesCompValue, costApproachValue, incomeApproachValue, approachWeights } = input;
  const parts: string[] = [
    `The Sales Comparison Approach, given primary weight of ${Math.round(approachWeights.market * 100)}%, ` +
    `indicates a market value of $${salesCompValue.toLocaleString()} based on analysis of comparable sales ` +
    `transactions adjusted for time, size, condition, and other relevant characteristics.`,
  ];
  if (costApproachValue) {
    parts.push(
      `The Cost Approach, weighted at ${Math.round(approachWeights.cost * 100)}%, indicates a value of ` +
      `$${costApproachValue.toLocaleString()} based on replacement cost new less estimated depreciation plus land value.`
    );
  }
  if (incomeApproachValue) {
    parts.push(
      `The Income Capitalization Approach indicates a value of $${incomeApproachValue.toLocaleString()} ` +
      `based on the property's income-producing potential and market-derived capitalization rate.`
    );
  }
  parts.push(
    `After considering all applicable approaches and giving greatest weight to the Sales Comparison Approach, ` +
    `the final opinion of market value is $${salesCompValue.toLocaleString()}.`
  );
  return parts.join(" ");
}
