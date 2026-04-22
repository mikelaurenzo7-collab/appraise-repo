/**
 * Flat-fee pricing tiers with money-back guarantee.
 *
 * Replaces the prior 25% contingency model. We are a software tool, not a
 * legal representative — contingency pricing is attorney territory.
 *
 * Tiers are indexed by the taxpayer's assessed value. The guarantee copy
 * is presented alongside checkout and in the /pricing page.
 */

export interface PricingTier {
  id: "starter" | "standard" | "premium";
  label: string;
  priceCents: number; // stripe amount, USD
  assessedValueMaxCents: number | null; // null = no upper bound
  blurb: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    label: "Starter",
    priceCents: 7900,
    assessedValueMaxCents: 500_000 * 100,
    blurb: "Homes assessed under $500,000",
  },
  {
    id: "standard",
    label: "Standard",
    priceCents: 14900,
    assessedValueMaxCents: 1_500_000 * 100,
    blurb: "Homes assessed $500,000 – $1.5M",
  },
  {
    id: "premium",
    label: "Premium",
    priceCents: 29900,
    assessedValueMaxCents: null,
    blurb: "Homes over $1.5M and small commercial / multi-unit",
  },
];

export function selectPricingTier(assessedValueCents: number | null | undefined): PricingTier {
  if (!assessedValueCents || assessedValueCents <= 0) return PRICING_TIERS[0];
  for (const tier of PRICING_TIERS) {
    if (tier.assessedValueMaxCents === null || assessedValueCents <= tier.assessedValueMaxCents) {
      return tier;
    }
  }
  return PRICING_TIERS[PRICING_TIERS.length - 1];
}

export const MONEY_BACK_GUARANTEE_COPY =
  "If our appeal doesn't reduce your assessment, request a full refund within 60 days of your county's decision. No negotiation required.";

export const SCRIVENER_AUTHORIZATION_TEXT = `I authorize AppraiseAI to complete and submit the property tax appeal I have reviewed above to my county's online filing portal on my behalf, using the taxpayer identifiers I have provided for this run.

AppraiseAI is acting solely as a software tool to transmit forms I have reviewed and approved. AppraiseAI is not my legal representative, does not provide legal advice about my specific case, and does not undertake to negotiate with the county on my behalf beyond submitting the form I authorize here.

I understand that:
  • The information I have provided is complete and accurate to the best of my knowledge.
  • I am the property owner or have authority to act for the owner of record.
  • I may withdraw this authorization at any time before submission by contacting support.
  • AppraiseAI's fee is a flat charge for the filing service and is fully refundable under the terms of the money-back guarantee described at checkout.`;
