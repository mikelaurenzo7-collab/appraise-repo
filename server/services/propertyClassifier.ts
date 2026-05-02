import { invokeLLM } from "../_core/llm";
import { hashLLMInput, withLLMCache } from "../_core/lcache";

export type PropertyType = "residential" | "multi-family" | "commercial" | "agricultural" | "industrial" | "land" | "unknown";

/**
 * Classify property type based on address and optional details
 * Uses LLM to infer from address patterns and user-provided info.
 *
 * Result is cached for 30 days keyed by the input tuple — the same
 * (address, sqft, beds, baths) always classifies the same way, so we never
 * re-call the LLM for it.
 */
export async function classifyPropertyType(
  address: string,
  squareFeet?: number,
  bedrooms?: number,
  bathrooms?: number
): Promise<PropertyType> {
  const cacheKey = `llm:classify:${hashLLMInput([address, squareFeet, bedrooms, bathrooms])}`;
  try {
    return await withLLMCache<PropertyType>(cacheKey, "classify-llm", 30 * 24 * 3600, async () => {
      const prompt = `Classify the property type based on this information:
Address: ${address}
Square Feet: ${squareFeet || "unknown"}
Bedrooms: ${bedrooms || "unknown"}
Bathrooms: ${bathrooms || "unknown"}

Respond with ONLY one of these values (no explanation):
- residential (single-family home)
- multi-family (apartment, duplex, triplex, etc)
- commercial (office, retail, warehouse)
- agricultural (farm, ranch, orchard)
- industrial (manufacturing, distribution)
- land (vacant land, development)
- unknown (cannot determine)`;

      const response = await invokeLLM({
        provider: "anthropic",
        // The classifier returns a single short label — no need to allocate
        // 32K output tokens per call. This caps the response budget.
        maxTokens: 32,
        messages: [
          {
            role: "system",
            content: "You are a property classification expert. Classify properties based on minimal information.",
          },
          { role: "user", content: prompt },
        ],
      });

      const content = response.choices[0]?.message.content;
      const contentStr = typeof content === "string" ? content : "unknown";
      const classification = contentStr.toLowerCase().trim() || "unknown";

      const validTypes: PropertyType[] = ["residential", "multi-family", "commercial", "agricultural", "industrial", "land", "unknown"];
      const cleanedClassification = classification.replace(/[^a-z-]/g, "");
      if (validTypes.includes(cleanedClassification as PropertyType)) {
        return cleanedClassification as PropertyType;
      }
      return "unknown";
    });
  } catch (error) {
    console.error("[PropertyClassifier] Error classifying property:", error);
    return "unknown";
  }
}

/**
 * Heuristic classification based on address patterns (fallback if LLM fails)
 */
export function classifyByAddressPattern(address: string): PropertyType {
  const lower = address.toLowerCase();

  // Agricultural indicators
  if (/\b(farm|ranch|orchard|vineyard|acres?|rural|county road)\b/.test(lower)) {
    return "agricultural";
  }

  // Industrial indicators (check before commercial since "industrial park" should be industrial)
  if (/\b(industrial|warehouse|manufacturing|distribution|factory)\b/.test(lower)) {
    return "industrial";
  }

  // Commercial indicators
  if (/\b(suite|ste|office|plaza|center|mall|commercial)\b/.test(lower)) {
    return "commercial";
  }

  // Land indicators
  if (/\b(lot|parcel|vacant|undeveloped|development)\b/.test(lower)) {
    return "land";
  }

  // Multi-family indicators
  if (/\b(apt|apartment|unit|building|complex|condo|townhouse|duplex|triplex|multi)\b/.test(lower)) {
    return "multi-family";
  }

  // Default to residential (most common)
  return "residential";
}
