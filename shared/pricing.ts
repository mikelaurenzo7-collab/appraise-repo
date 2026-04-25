/**
 * AppraiseAI — Pricing Tiers
 *
 * Three tiers indexed by filing method (not assessed value):
 *
 *  free     — AI assessment + appeal strength score + teaser summary. No PDF, no comps detail.
 *  pro_se   — Full PDF report + comparable sales + adjustment grid + DIY filing guide + support. $49 flat.
 *  automated — Everything in Pro Se + we auto-fill and submit the county portal form. $99 flat.
 *
 * The money-back guarantee applies to paid tiers: if the county doesn't reduce the assessment,
 * request a full refund within 60 days of the county's decision.
 */

export type PricingTierId = "free" | "pro_se" | "automated";

export interface PricingTier {
  id: PricingTierId;
  label: string;
  priceCents: number;       // 0 for free
  filingMethod: "none" | "pro-se" | "poa";
  tagline: string;
  blurb: string;
  features: string[];
  cta: string;
  highlighted?: boolean;    // true = visually featured on pricing page
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    label: "Free Assessment",
    priceCents: 0,
    filingMethod: "none",
    tagline: "See if you're over-assessed",
    blurb: "Instant AI-powered property assessment with your appeal strength score. No credit card required.",
    features: [
      "AI market value estimate",
      "Appeal strength score (0–100)",
      "Over-assessment gap calculation",
      "County appeal deadline lookup",
      "Teaser summary report",
    ],
    cta: "Get Free Assessment",
  },
  {
    id: "pro_se",
    label: "Pro Se",
    priceCents: 4900,
    filingMethod: "pro-se",
    tagline: "File it yourself — we do the heavy lifting",
    blurb: "Full professional appraisal report with comparable sales, adjustment grid, and a step-by-step DIY filing guide. You file, we prepare everything.",
    features: [
      "Everything in Free",
      "Full PDF appraisal report",
      "Comparable sales analysis (up to 8 comps)",
      "Quantitative adjustment grid",
      "Income approach (multifamily)",
      "Street View + satellite imagery in report",
      "Step-by-step DIY filing guide",
      "Email support",
      "60-day money-back guarantee",
    ],
    cta: "Get Full Report — $49",
    highlighted: false,
  },
  {
    id: "automated",
    label: "Automated Filing",
    priceCents: 9900,
    filingMethod: "poa",
    tagline: "We file it for you — done in minutes",
    blurb: "Everything in Pro Se plus our software auto-fills and submits your county's online appeal form after you review and authorize. Zero paperwork.",
    features: [
      "Everything in Pro Se",
      "Auto-fill county portal form",
      "Scrivener authorization (you stay filer of record)",
      "Real-time filing status tracking",
      "Priority email support",
      "60-day money-back guarantee",
    ],
    cta: "File Automatically — $99",
    highlighted: true,
  },
];

/** Look up a tier by its ID */
export function getTierById(id: PricingTierId): PricingTier {
  return PRICING_TIERS.find((t) => t.id === id) ?? PRICING_TIERS[0];
}

/** Map a filing method string to the matching tier */
export function getTierByFilingMethod(filingMethod: string | null | undefined): PricingTier {
  if (!filingMethod || filingMethod === "none") return PRICING_TIERS[0];
  if (filingMethod === "pro-se") return PRICING_TIERS[1];
  if (filingMethod === "poa") return PRICING_TIERS[2];
  return PRICING_TIERS[0];
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
