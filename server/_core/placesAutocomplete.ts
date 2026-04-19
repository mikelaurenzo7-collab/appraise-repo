export async function getPlacePredictions(input: string): Promise<string[]> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:us`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as { predictions?: Array<{ description: string }> };
    
    if (data.predictions && Array.isArray(data.predictions)) {
      return data.predictions.map((p) => p.description);
    }
    return [];
  } catch (error) {
    console.error("[PlacesAutocomplete] Error:", error);
    return [];
  }
}
