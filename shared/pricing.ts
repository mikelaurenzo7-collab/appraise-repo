/**
 * AppraiseAI — Pricing Tiers (4-Tier Model)
 *
 *  free                — AI assessment + appeal strength score + teaser summary. No PDF.
 *  pro_se              — Full 40-page PDF report + DIY filing guide. $49 flat.
 *  automated_standard  — Everything in Pro Se + we mail certified appeal packet. $99 flat. All 3,143 counties.
 *  automated_express   — Everything in Standard + same-day electronic portal filing. $129 flat. ~650 portal counties.
 */

export type PricingTierId = "free" | "pro_se" | "automated_standard" | "automated_express";

export interface PricingTier {
  id: PricingTierId;
  label: string;
  priceCents: number;
  filingMethod: "none" | "pro-se" | "automated_standard" | "automated_express";
  tagline: string;
  blurb: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
  badgeColor?: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    label: "Free Analysis",
    priceCents: 0,
    filingMethod: "none",
    tagline: "See if you're over-assessed",
    blurb: "Instant AI-powered property assessment with your appeal strength score. No credit card required.",
    features: [
      "AI market value estimate",
      "Appeal strength score (0-100)",
      "Over-assessment gap calculation",
      "County appeal deadline lookup",
      "Teaser summary report (4 pages)",
    ],
    cta: "Get Free Assessment",
  },
  {
    id: "pro_se",
    label: "Pro Se Guided",
    priceCents: 4900,
    filingMethod: "pro-se",
    tagline: "File it yourself — we do the heavy lifting",
    blurb: "Full 40-page professional appraisal report with comparable sales, adjustment grid, and a step-by-step DIY filing guide. You file, we prepare everything.",
    features: [
      "Everything in Free",
      "Full 40-page appraisal report",
      "Comparable sales analysis (up to 8 comps)",
      "Quantitative adjustment grid",
      "Income approach (multifamily)",
      "Street View + satellite imagery",
      "Step-by-step DIY filing guide",
      "County-specific form instructions",
      "Email support",
      "60-day money-back guarantee",
    ],
    cta: "Get Full Report — $49",
    badge: "DIY + Support",
    badgeColor: "bg-[#0F172A] text-white",
  },
  {
    id: "automated_standard",
    label: "Automated — Standard",
    priceCents: 9900,
    filingMethod: "automated_standard",
    tagline: "We mail your appeal — you do nothing",
    blurb: "Everything in Pro Se plus we physically mail your certified appeal packet via USPS Certified Mail. Available in all 3,143 US counties. Delivered in 3-5 business days.",
    features: [
      "Everything in Pro Se",
      "We prepare and mail your appeal packet",
      "USPS Certified Mail with tracking",
      "Available in all 3,143 US counties",
      "Scrivener authorization (you stay filer of record)",
      "Real-time filing status tracking",
      "3-5 business day delivery",
      "Priority email support",
      "60-day money-back guarantee",
    ],
    cta: "File by Mail — $99",
    badge: "All Counties",
    badgeColor: "bg-[#7C3AED] text-white",
  },
  {
    id: "automated_express",
    label: "Automated — Express",
    priceCents: 12900,
    filingMethod: "automated_express",
    tagline: "Same-day electronic filing — fastest possible",
    blurb: "Everything in Standard plus we file electronically through your county's online portal same-day. Instant confirmation receipt. Available in ~650 portal-enabled counties.",
    features: [
      "Everything in Standard",
      "Same-day electronic portal filing",
      "Instant confirmation receipt",
      "Available in ~650 portal-enabled counties",
      "Fastest path to hearing date",
      "Scrivener authorization + audit trail",
      "Real-time portal status tracking",
      "Priority email + phone support",
      "60-day money-back guarantee",
    ],
    cta: "File Express — $129",
    highlighted: true,
    badge: "Fastest",
    badgeColor: "bg-[#F59E0B] text-[#0F172A]",
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
  if (filingMethod === "automated_standard") return PRICING_TIERS[2];
  if (filingMethod === "automated_express") return PRICING_TIERS[3];
  // Legacy: "poa" maps to automated_express
  if (filingMethod === "poa") return PRICING_TIERS[3];
  return PRICING_TIERS[0];
}

export const MONEY_BACK_GUARANTEE_COPY =
  "If our appeal doesn't reduce your assessment, request a full refund within 60 days of your county's decision. No negotiation required.";

export const SCRIVENER_AUTHORIZATION_TEXT = `I authorize AppraiseAI to complete and submit the property tax appeal I have reviewed above to my county's online filing portal on my behalf, using the taxpayer identifiers I have provided for this run.
AppraiseAI is acting solely as a software tool to transmit forms I have reviewed and approved. AppraiseAI is not my legal representative, does not provide legal advice about my specific case, and does not undertake to negotiate with the county on my behalf beyond submitting the form I authorize here.
I understand that:
  - The information I have provided is complete and accurate to the best of my knowledge.
  - I am the property owner or have authority to act for the owner of record.
  - I may withdraw this authorization at any time before submission by contacting support.
  - AppraiseAI's fee is a flat charge for the filing service and is fully refundable under the terms of the money-back guarantee described at checkout.`;
