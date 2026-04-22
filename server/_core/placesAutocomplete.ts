/**
 * Address autocomplete using pattern matching
 * Provides immediate suggestions for common US addresses
 */
export async function getPlacePredictions(input: string): Promise<string[]> {
  try {
    const normalized = input.toLowerCase().trim();
    
    // Common US cities
    const commonAddresses = [
      "Austin, TX",
      "New York, NY",
      "Los Angeles, CA",
      "Chicago, IL",
      "Houston, TX",
      "Phoenix, AZ",
      "Philadelphia, PA",
      "San Antonio, TX",
      "San Diego, CA",
      "Dallas, TX",
      "San Jose, CA",
      "Jacksonville, FL",
      "Fort Worth, TX",
      "Columbus, OH",
      "Charlotte, NC",
      "San Francisco, CA",
      "Indianapolis, IN",
      "Seattle, WA",
      "Denver, CO",
      "Boston, MA",
      "Miami, FL",
      "Portland, OR",
      "Atlanta, GA",
    ];

    const predictions: string[] = [];
    
    // Match against common addresses
    for (const addr of commonAddresses) {
      if (addr.toLowerCase().includes(normalized)) {
        predictions.push(addr);
      }
    }

    // If input has a number (street address pattern), generate suggestions
    if (/\d/.test(normalized)) {
      const match = normalized.match(/(\d+)\s*(.*)/);
      if (match) {
        const [, num, street] = match;
        const commonStreets = [
          "Main St",
          "Oak St",
          "Elm St",
          "First St",
          "Second St",
          "Third St",
          "Park Ave",
          "Washington Ave",
          "Jefferson Ave",
          "Lincoln Ave",
          "Van Buren St",
          "Congress Ave",
          "Lamar Blvd",
          "Barton Springs Rd",
          "6th St",
          "7th St",
          "8th St",
          "9th St",
          "10th St",
        ];

        // Generate suggestions for matching streets
        for (const s of commonStreets) {
          // Match if street name partially matches input
          if (s.toLowerCase().includes(street.trim()) || street.includes(s.substring(0, 3).toLowerCase())) {
            const fullAddr = `${num} ${s}, Austin, TX`;
            predictions.push(fullAddr);
          }
        }
        
        // If no matches, just suggest the number with common streets
        if (predictions.length === 0) {
          for (const s of commonStreets.slice(0, 3)) {
            predictions.push(`${num} ${s}, Austin, TX`);
          }
        }
      }
    }

    // Return top 5 suggestions
    return predictions.slice(0, 5);
  } catch (error) {
    console.error("[PlacesAutocomplete] Error:", error);
    return [];
  }
}
