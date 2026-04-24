/**
 * Thin wrapper over the Umami global plus optional runtime bootstrapping.
 *
 * Umami exposes `window.umami.track(eventName, eventData?)`. When the
 * script is blocked (adblockers, env not configured, offline), calls are
 * silently dropped so the UI never breaks. Keep event names stable —
 * they're the foundation of the conversion-funnel dashboard.
 *
 * Event naming: verb_noun in snake_case. Keep the set small; prefer
 * props over new event names for variants (tier, submissionId, etc.).
 */

type UmamiEventData = Record<string, string | number | boolean | null | undefined>;

interface UmamiGlobal {
  track?: (eventName: string, eventData?: UmamiEventData) => void;
}

const ANALYTICS_SCRIPT_ID = "appraise-analytics";

function getAnalyticsConfig() {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim().replace(/\/+$/, "");
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID?.trim();
  if (!endpoint || !websiteId) return null;
  return { endpoint, websiteId };
}

declare global {
  interface Window {
    umami?: UmamiGlobal;
  }
}

export const AnalyticsEvent = {
  FormStart: "form_start",
  FormStepComplete: "form_step_complete",
  FormSubmit: "form_submit",
  AnalysisViewed: "analysis_viewed",
  CheckoutStarted: "checkout_started",
  CheckoutAbandoned: "checkout_abandoned",
  PaymentSuccess: "payment_success",
  FilingStarted: "filing_started",
  FilingSubmitted: "filing_submitted",
  RefundRequested: "refund_requested",
  LeadCaptured: "lead_captured",
  AddressAutocompletePicked: "address_autocomplete_picked",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export function bootstrapAnalytics(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(ANALYTICS_SCRIPT_ID)) return;

  const config = getAnalyticsConfig();
  if (!config) return;

  const script = document.createElement("script");
  script.id = ANALYTICS_SCRIPT_ID;
  script.defer = true;
  script.src = `${config.endpoint}/umami`;
  script.dataset.websiteId = config.websiteId;
  document.head.appendChild(script);
}

export function track(event: AnalyticsEventName, data?: UmamiEventData): void {
  try {
    if (typeof window === "undefined") return;
    window.umami?.track?.(event, data);
  } catch {
    // Analytics must never break the UI.
  }
}
