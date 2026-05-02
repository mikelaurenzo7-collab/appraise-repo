import { describe, it, expect } from "vitest";

describe("Google API Keys Validation", () => {
  it("GOOGLE_MAPS_API_KEY is set", () => {
    // Server-side Places autocomplete and Geocoding key.
    // Also accepted as GOOGLE_MAPS_PLATFORM_API_KEY (legacy alias).
    const key =
      process.env.GOOGLE_MAPS_API_KEY ??
      process.env.GOOGLE_MAPS_PLATFORM_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
    expect(key!.startsWith("AIza")).toBe(true);
  });

  it("GOOGLE_CSE_API_KEY is set", () => {
    const key = process.env.GOOGLE_CSE_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
    expect(key!.startsWith("AIza")).toBe(true);
  });

  it("GOOGLE_CSE_CX is set", () => {
    const cx = process.env.GOOGLE_CSE_CX;
    expect(cx).toBeDefined();
    expect(cx!.length).toBeGreaterThan(5);
  });

  it("VITE_GOOGLE_MAPS_API_KEY is set for frontend", () => {
    // Client-side Google Maps JavaScript API key.
    const key = process.env.VITE_GOOGLE_MAPS_API_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
    expect(key!.startsWith("AIza")).toBe(true);
  });

  it("Google Maps Geocoding API responds successfully", async () => {
    const key =
      process.env.GOOGLE_MAPS_API_KEY ??
      process.env.GOOGLE_MAPS_PLATFORM_API_KEY;
    if (!key) return;

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway+Mountain+View+CA&key=${key}`
    );
    const data = await res.json();
    expect(res.ok).toBe(true);
    expect(data.status).toBe("OK");
    expect(data.results.length).toBeGreaterThan(0);
  });

  it.skip("Google Custom Search API responds successfully (waiting for API propagation)", async () => {
    const key = process.env.GOOGLE_CSE_API_KEY;
    const cx = process.env.GOOGLE_CSE_CX;
    if (!key || !cx) return;

    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=property+tax+assessment+Naperville+IL&num=3`
    );
    const data = await res.json();
    expect(res.ok).toBe(true);
    expect(data.items).toBeDefined();
    expect(data.items.length).toBeGreaterThan(0);
  });
});
