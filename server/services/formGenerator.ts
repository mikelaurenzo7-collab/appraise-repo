/**
 * Dynamic Form Generator
 * Generates county-specific appeal forms based on tier and county
 */

import { getCountyById } from "../db";
import { County } from "../../drizzle/schema";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "phone" | "number" | "date" | "textarea" | "select";
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface GeneratedForm {
  title: string;
  description: string;
  county: County;
  tier: "poa" | "pro-se";
  fields: FormField[];
  instructions: string[];
  deadline: string;
  filingMethods: string[];
  estimatedTime: string;
}

/**
 * Generate county-specific form based on tier
 */
export async function generateCountyForm(
  countyId: number,
  tier: "poa" | "pro-se"
): Promise<GeneratedForm | null> {
  const county = await getCountyById(countyId);
  if (!county) return null;

  const baseFields: FormField[] = [
    {
      name: "ownerName",
      label: "Property Owner Name",
      type: "text",
      required: true,
      placeholder: "Full name",
    },
    {
      name: "ownerEmail",
      label: "Email Address",
      type: "email",
      required: true,
      placeholder: "your@email.com",
    },
    {
      name: "ownerPhone",
      label: "Phone Number",
      type: "phone",
      required: true,
      placeholder: "(555) 123-4567",
    },
    {
      name: "propertyAddress",
      label: "Property Address",
      type: "text",
      required: true,
      placeholder: "123 Main St",
    },
    {
      name: "parcelNumber",
      label: "Parcel Number",
      type: "text",
      required: true,
      placeholder: "From tax bill or assessor website",
    },
    {
      name: "assessedValue",
      label: "Current Assessed Value",
      type: "number",
      required: true,
      placeholder: "From tax bill",
    },
    {
      name: "marketValue",
      label: "Your Estimated Market Value",
      type: "number",
      required: true,
      placeholder: "Based on comparable sales",
    },
    {
      name: "appealReason",
      label: "Reason for Appeal",
      type: "select",
      required: true,
      options: [
        { value: "overassessed", label: "Property is overassessed" },
        { value: "comparable", label: "Comparable properties assessed lower" },
        { value: "condition", label: "Property condition not reflected" },
        { value: "other", label: "Other reason" },
      ],
    },
    {
      name: "supportingDocuments",
      label: "Supporting Documents",
      type: "textarea",
      required: false,
      placeholder: "List any documents you're providing (appraisals, photos, etc.)",
    },
  ];

  const poaSpecificFields: FormField[] = [
    {
      name: "poaAuthorization",
      label: "I authorize AppraiseAI to represent me",
      type: "select",
      required: true,
      options: [
        { value: "yes", label: "Yes, I authorize representation" },
        { value: "no", label: "No, I prefer to file myself" },
      ],
    },
  ];

  const proSeSpecificFields: FormField[] = [
    {
      name: "filingMethod",
      label: "How will you file?",
      type: "select",
      required: true,
      options: [
        { value: "online", label: "Online portal" },
        { value: "email", label: "Email" },
        { value: "mail", label: "Mail" },
        { value: "inperson", label: "In-person" },
      ],
    },
  ];

  const fields = [
    ...baseFields,
    ...(tier === "poa" ? poaSpecificFields : proSeSpecificFields),
  ];

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + (county.proSeDeadlineDays || 30));

  const instructions = [
    `File your appeal within ${county.proSeDeadlineDays || 30} days of receiving this form`,
    `Deadline: ${deadline.toLocaleDateString()}`,
    `Filing method: ${getFilingMethods(county).join(", ")}`,
    `Contact: ${county.assessorName} - ${county.assessorPhone}`,
    `Portal: ${county.portalUrl}`,
  ];

  return {
    title: `${county.countyName}, ${county.state} - Property Tax Appeal Form`,
    description: `County-specific appeal form for ${county.countyName}. ${
      tier === "poa"
        ? "AppraiseAI will handle filing and representation."
        : "We'll provide guidance and coaching throughout the process."
    }`,
    county,
    tier,
    fields,
    instructions,
    deadline: deadline.toISOString().split("T")[0],
    filingMethods: getFilingMethods(county),
    estimatedTime: tier === "poa" ? "5-10 minutes" : "15-20 minutes",
  };
}

/**
 * Get available filing methods for county
 */
function getFilingMethods(county: County): string[] {
  const methods: string[] = [];

  if (county.hasOnlinePortal) methods.push("Online Portal");
  if (county.acceptsEmail) methods.push("Email");
  if (county.acceptsMail) methods.push("Mail");
  if (county.acceptsInPerson) methods.push("In-Person");

  return methods;
}

/**
 * Generate filing checklist
 */
export function generateFilingChecklist(county: County, tier: "poa" | "pro-se") {
  return {
    preFilingChecks: [
      "✓ Verify property address and parcel number",
      "✓ Gather tax bill and assessment notice",
      "✓ Collect comparable sales data",
      "✓ Take property photos if applicable",
      "✓ Review county appeal requirements",
    ],
    requiredDocuments: [
      "Property tax bill",
      "Assessment notice",
      "Completed appeal form",
      "Comparable sales analysis",
      "Property photos (if applicable)",
      ...(tier === "poa" ? ["Power of Attorney form"] : []),
    ],
    filingSteps: [
      `1. Complete the ${county.countyName} appeal form`,
      `2. Gather required documents`,
      `3. File via ${getFilingMethods(county)[0]} by ${county.proSeDeadlineDays} days`,
      `4. Keep confirmation of filing`,
      `5. Await hearing notice (typically ${county.hearingScheduleDays} days)`,
      tier === "poa"
        ? "6. AppraiseAI will represent you at the hearing"
        : "6. Prepare for your hearing with our coaching",
    ],
    deadlineInfo: {
      poaDeadline: `${county.poaDeadlineDays} days from assessment notice`,
      proSeDeadline: `${county.proSeDeadlineDays} days from assessment notice`,
      hearingSchedule: `Hearing typically scheduled ${county.hearingScheduleDays} days after filing`,
    },
  };
}
