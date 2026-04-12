import { invokeLLM } from "../_core/llm";

export type PropertyType = "residential" | "multi-family" | "commercial" | "agricultural" | "industrial" | "land" | "unknown";

/**
 * Classify property type based on address and optional details
 * Uses LLM to infer from address patterns and user-provided info
 */
export async function classifyPropertyType(
  address: string,
  squareFeet?: number,
  bedrooms?: number,
  bathrooms?: number
): Promise<PropertyType> {
  try {
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
      messages: [
        {
          role: "system",
          content: "You are a property classification expert. Classify properties based on minimal information.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message.content;
    const contentStr = typeof content === "string" ? content : "unknown";
    const classification = contentStr.toLowerCase().trim() || "unknown";

    // Validate response
    const validTypes: PropertyType[] = ["residential", "multi-family", "commercial", "agricultural", "industrial", "land", "unknown"];
    const cleanedClassification = classification.replace(/[^a-z-]/g, "");
    if (validTypes.includes(cleanedClassification as PropertyType)) {
      return cleanedClassification as PropertyType;
    }

    return "unknown";
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
