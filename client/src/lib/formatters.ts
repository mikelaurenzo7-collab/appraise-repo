/**
 * Shared Formatting Utilities for AppraiseAI
 */

/**
 * Formats a number as USD currency.
 * @param v The value to format in dollars (not cents)
 * @returns Formatted currency string or "—" if value is missing
 */
export function formatCurrency(
  v: number | null | undefined,
  fallback: string = "—"
): string {
  if (v == null || (typeof v === "number" && isNaN(v))) return fallback;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

/**
 * Formats a number as USD currency in 'k' shorthand (e.g., $150k).
 * @param v The value to format in dollars
 * @returns Formatted shorthand string or "—" if value is missing
 */
export function formatCurrencyShorthand(v: number | null | undefined): string {
  if (v == null || v === 0) return "—";
  return `$${(v / 1000).toFixed(0)}k`;
}

/**
 * Formats a date or string into a localized date string.
 * @param d The date or date string to format
 * @param options Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string or "—" if date is missing/invalid
 */
export function formatDate(
  d: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", options);
}
