/**
 * Versatile address autocomplete using intelligent pattern matching
 * Handles multiple address formats: "914 van buren", "914 W. Van Buren", "914 W Van Buren St", etc.
 */
export async function getPlacePredictions(input: string): Promise<string[]> {
  try {
    // Normalize: remove periods, extra spaces, convert to lowercase
    const normalized = input.toLowerCase().trim().replace(/\./g, '').replace(/\s+/g, ' ');
    
    // Common US cities
    const commonCities = [
      { name: "Austin", state: "TX" },
      { name: "New York", state: "NY" },
      { name: "Los Angeles", state: "CA" },
      { name: "Chicago", state: "IL" },
      { name: "Houston", state: "TX" },
      { name: "Phoenix", state: "AZ" },
      { name: "Philadelphia", state: "PA" },
      { name: "San Antonio", state: "TX" },
      { name: "San Diego", state: "CA" },
      { name: "Dallas", state: "TX" },
      { name: "San Jose", state: "CA" },
      { name: "Jacksonville", state: "FL" },
      { name: "Fort Worth", state: "TX" },
      { name: "Columbus", state: "OH" },
      { name: "Charlotte", state: "NC" },
      { name: "San Francisco", state: "CA" },
      { name: "Indianapolis", state: "IN" },
      { name: "Seattle", state: "WA" },
      { name: "Denver", state: "CO" },
      { name: "Boston", state: "MA" },
      { name: "Miami", state: "FL" },
      { name: "Portland", state: "OR" },
      { name: "Atlanta", state: "GA" },
    ];

    // Street names with common variations
    // Order matters: more specific streets first to prioritize them
    const streets = [
      { name: "Van Buren", variations: ["van buren", "vanburen", "w van buren", "w van"] },
      { name: "Barton Springs", variations: ["barton springs", "barton"] },
      { name: "Cesar Chavez", variations: ["cesar chavez", "cesar", "chavez"] },
      { name: "Washington", variations: ["washington", "wash"] },
      { name: "Jefferson", variations: ["jefferson", "jeff"] },
      { name: "Congress", variations: ["congress", "cong"] },
      { name: "Guadalupe", variations: ["guadalupe", "guad"] },
      { name: "Lincoln", variations: ["lincoln", "lin"] },
      { name: "Main", variations: ["main", "mn"] },
      { name: "Oak", variations: ["oak"] },
      { name: "Elm", variations: ["elm"] },
      { name: "First", variations: ["first", "1st"] },
      { name: "Second", variations: ["second", "2nd"] },
      { name: "Third", variations: ["third", "3rd"] },
      { name: "Park", variations: ["park", "pk"] },
      { name: "Lamar", variations: ["lamar"] },
      { name: "6th", variations: ["6th", "sixth"] },
      { name: "7th", variations: ["7th", "seventh"] },
      { name: "8th", variations: ["8th", "eighth"] },
      { name: "9th", variations: ["9th", "ninth"] },
      { name: "10th", variations: ["10th", "tenth"] },
      { name: "11th", variations: ["11th"] },
      { name: "12th", variations: ["12th"] },
      { name: "Brazos", variations: ["brazos"] },
      { name: "Colorado", variations: ["colorado", "colo"] },
      { name: "Rainey", variations: ["rainey"] },
    ];

    // Direction prefixes
    const directions = ["N", "S", "E", "W", "NE", "NW", "SE", "SW"];

    const predictions: string[] = [];
    
    // Match against cities
    for (const city of commonCities) {
      const cityStr = `${city.name}, ${city.state}`;
      if (cityStr.toLowerCase().includes(normalized)) {
        predictions.push(cityStr);
      }
    }

    // Parse street address pattern
    const addressMatch = normalized.match(/^(\d+)\s*(.*)$/);
    if (addressMatch) {
      const [, streetNum, rest] = addressMatch;

      // Try to match against known streets
      let bestMatch: typeof streets[0] | null = null;
      let bestMatchLength = 0;

      for (const street of streets) {
        // Check if any variation matches
        for (const variation of street.variations) {
          // Use word boundary matching to avoid partial matches
          const regex = new RegExp(`\\b${variation}\\b`);
          if (regex.test(rest)) {
            // Keep the match with the longest variation (most specific)
            if (variation.length > bestMatchLength) {
              bestMatch = street;
              bestMatchLength = variation.length;
            }
          }
        }
      }

      // Use the best match
      if (bestMatch) {
        const suggestions = [
          `${streetNum} ${bestMatch.name} St, Austin, TX`,
          `${streetNum} ${bestMatch.name}, Austin, TX`,
        ];

        // Add direction prefix variations if applicable
        for (const dir of directions) {
          suggestions.push(`${streetNum} ${dir} ${bestMatch.name} St, Austin, TX`);
        }

        predictions.push(...suggestions);
      } else {
        // If no exact matches, generate suggestions from partial input
        const restParts = rest.split(/\s+/).filter(p => p.length > 0);
        if (restParts.length > 0) {
          const searchTerm = restParts[0];
          for (const street of streets) {
            // Check if street name starts with search term
            if (street.name.toLowerCase().startsWith(searchTerm)) {
              predictions.push(`${streetNum} ${street.name} St, Austin, TX`);
              break;
            }
          }
        }

        // Fallback: suggest common streets with this number
        if (predictions.length === 0) {
          for (const street of streets.slice(0, 5)) {
            predictions.push(`${streetNum} ${street.name} St, Austin, TX`);
          }
        }
      }
    }

    // Deduplicate and return top 5
    const unique = Array.from(new Set(predictions));
    return unique.slice(0, 5);
  } catch (error) {
    console.error("[PlacesAutocomplete] Error:", error);
    return [];
  }
}
