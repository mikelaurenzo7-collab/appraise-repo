/**
 * Gemini API Key Validation Test
 * Validates that the GEMINI_API_KEY is configured and the Gemini API is reachable.
 */
import { describe, it, expect } from "vitest";
import axios from "axios";

describe("Gemini API Key Validation", () => {
  it("GEMINI_API_KEY is set in environment", () => {
    const key = process.env.GEMINI_API_KEY;
    expect(key).toBeTruthy();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("Gemini 2.5 Flash API responds successfully", async () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("[Gemini] GEMINI_API_KEY not set — skipping live API test");
      return;
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`,
      {
        contents: [{ parts: [{ text: "Reply with exactly: OK" }] }],
        generationConfig: { maxOutputTokens: 10 },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": key,
        },
        timeout: 15000,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.candidates).toBeDefined();
    expect(response.data.candidates.length).toBeGreaterThan(0);
    const text = response.data.candidates[0]?.content?.parts?.[0]?.text ?? "";
    console.log(`[Gemini] ✅ API connection successful — response: "${text.trim()}"`);
  }, 20000);

  it("Gemini 2.5 Pro API responds successfully", async () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("[Gemini] GEMINI_API_KEY not set — skipping live API test");
      return;
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent`,
      {
        contents: [{ parts: [{ text: "Reply with exactly: READY" }] }],
        generationConfig: { maxOutputTokens: 10 },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": key,
        },
        timeout: 20000,
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.candidates).toBeDefined();
    const text = response.data.candidates[0]?.content?.parts?.[0]?.text ?? "";
    console.log(`[Gemini] ✅ Gemini 2.5 Pro connection successful — response: "${text.trim()}"`);
  }, 25000);
});
