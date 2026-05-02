/**
 * Generic data API caller — used for third-party APIs like Google Places.
 * Now uses MAPBOX_ACCESS_TOKEN or direct API keys from ENV.
 */
import { ENV } from "./env";
import { scopedLogger } from "./logger";

const log = scopedLogger("DataApi");

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

// Google Places API — direct call using the server-side Places API key.
// The key is passed as a query parameter per Google's Places API spec;
// no Authorization header is needed or appropriate here.
export async function callGooglePlaces(
  input: string,
  sessionToken?: string
): Promise<unknown> {
  if (!ENV.googleMapsApiKey) {
    throw new Error("GOOGLE_MAPS_PLATFORM_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    input,
    key: ENV.googleMapsApiKey,
    types: "address",
    components: "country:us",
  });
  if (sessionToken) params.set("sessiontoken", sessionToken);

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
  );

  if (!res.ok) throw new Error(`Google Places error: ${res.status}`);
  return res.json();
}

// Generic passthrough — for future API integrations
export async function callDataApi(
  apiId: string,
  _options: DataApiCallOptions = {}
): Promise<unknown> {
  // All data API calls now go through their native providers
  // (Google Places, Mapbox, etc.) which have direct keys in ENV.
  log.warn(`callDataApi called with "${apiId}" — verify this is still needed`, { apiId });
  return {};
}
