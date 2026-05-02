import { scopedLogger } from "./logger";

const log = scopedLogger("PlacesAutocomplete");
/**
 * Provider-agnostic address autocomplete.
 *
 * Providers:
 *   - "google"  (default)  Google Places Autocomplete via the Forge proxy.
 *                          Provides comprehensive US address data with
 *                          structured place details (city, state, zip, county).
 *   - "photon"             Komoot's hosted Photon — OSM-backed, no API key,
 *                          no IP bias, true prefix autocomplete. Fallback.
 *   - "mapbox"             Mapbox Geocoding v6 — excellent US data, 100k/mo
 *                          free. Requires MAPBOX_ACCESS_TOKEN.
 *
 * Selection via env var ADDRESS_AUTOCOMPLETE_PROVIDER (default: "google").
 * Runtime fallback: if the selected provider errors or returns zero
 * predictions for a ≥3-char query, Photon is consulted as a safety net.
 */

type Provider = "photon" | "google" | "mapbox";

const US_CENTER_LAT = 39.8283;
const US_CENTER_LNG = -98.5795;

export interface PlacesAutocompleteOptions {
  sessionToken?: string;
}

function selectedProvider(): Provider {
  const raw = (process.env.ADDRESS_AUTOCOMPLETE_PROVIDER || "").toLowerCase();
  if (raw === "google" || raw === "mapbox" || raw === "photon") return raw;
  return "google";
}

export async function getPlacePredictions(
  input: string,
  opts: PlacesAutocompleteOptions = {}
): Promise<string[]> {
  const provider = selectedProvider();
  let predictions: string[] = [];

  try {
    if (provider === "google") {
      predictions = await fetchFromGoogle(input, opts);
    } else if (provider === "mapbox") {
      predictions = await fetchFromMapbox(input, opts);
    } else {
      predictions = await fetchFromPhoton(input);
    }
  } catch (error) {
    log.error(`[PlacesAutocomplete] ${provider} error:`, { err: error });
  }

  // Safety net: if the configured provider failed or returned nothing, try
  // Photon (keyless, always available) before giving up. Avoids double-call
  // when Photon is already the selected provider.
  if (predictions.length === 0 && provider !== "photon") {
    try {
      predictions = await fetchFromPhoton(input);
    } catch (error) {
      log.error("[PlacesAutocomplete] photon fallback error:", { err: error });
    }
  }

  return predictions;
}

// ─── Photon (Komoot) ──────────────────────────────────────────────────────────
// Docs: https://photon.komoot.io  |  No key, no rate-limit contract.
// We bias to the US by centering on Lebanon, KS with a broad scale, and we
// filter results to `countrycode === "US"` before formatting.

interface PhotonFeature {
  properties?: {
    countrycode?: string;
    country?: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    postcode?: string;
    street?: string;
    housenumber?: string;
    name?: string;
    type?: string;
  };
}

async function fetchFromPhoton(input: string): Promise<string[]> {
  const params = new URLSearchParams({
    q: input,
    limit: "7",
    lang: "en",
    lat: String(US_CENTER_LAT),
    lon: String(US_CENTER_LNG),
    location_bias_scale: "0.3",
  });
  const url = `https://photon.komoot.io/api/?${params.toString()}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "AppraiseAI/1.0 (+appraiseai-njpz7grd.manus.space)" },
  });
  if (!response.ok) {
    log.error("[PlacesAutocomplete:photon] HTTP", { err: response.status });
    return [];
  }

  const data = (await response.json()) as { features?: PhotonFeature[] };
  if (!Array.isArray(data.features)) return [];

  const formatted = data.features
    .filter((f) => f.properties?.countrycode === "US")
    .map((f) => formatPhotonFeature(f))
    .filter((s): s is string => Boolean(s));

  // De-dupe while preserving order — Photon occasionally returns OSM duplicates.
  return Array.from(new Set(formatted));
}

function formatPhotonFeature(f: PhotonFeature): string | null {
  const p = f.properties;
  if (!p) return null;
  const streetLine =
    p.housenumber && p.street
      ? `${p.housenumber} ${p.street}`
      : p.street || p.name || "";
  const city = p.city || p.town || p.village || p.county || "";
  const state = p.state || "";
  const zip = p.postcode || "";

  const parts = [streetLine, city, [state, zip].filter(Boolean).join(" ")]
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(", ");
}

// ─── Google Places ────────────────────────────────────────────────────────────
// Auth: GOOGLE_MAPS_API_KEY (canonical) or GOOGLE_MAPS_PLATFORM_API_KEY (legacy alias).

const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY ??
  process.env.GOOGLE_MAPS_PLATFORM_API_KEY ??
  "";

async function fetchFromGoogle(
  input: string,
  opts: PlacesAutocompleteOptions
): Promise<string[]> {
  const params = new URLSearchParams({
    key: GOOGLE_MAPS_API_KEY,
    input,
    components: "country:us",
    types: "address",
    location: `${US_CENTER_LAT},${US_CENTER_LNG}`,
    radius: "3500000",
  });
  if (opts.sessionToken) params.set("sessiontoken", opts.sessionToken);

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    log.error("[PlacesAutocomplete:google] HTTP", { err: response.status });
    return [];
  }
  const data = (await response.json()) as {
    status?: string;
    error_message?: string;
    predictions?: Array<{ description: string; place_id?: string }>;
  };
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    log.error("[PlacesAutocomplete:google] status", { status: data.status, message: data.error_message ?? "" });
    return [];
  }
  return Array.isArray(data.predictions)
    ? data.predictions.map((p) => p.description)
    : [];
}

// ─── Mapbox Geocoding v6 ──────────────────────────────────────────────────────
// Docs: https://docs.mapbox.com/api/search/geocoding/
// 100k requests/month free. Requires MAPBOX_ACCESS_TOKEN in env.

async function fetchFromMapbox(
  input: string,
  opts: PlacesAutocompleteOptions
): Promise<string[]> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    log.error("[PlacesAutocomplete:mapbox] MAPBOX_ACCESS_TOKEN not set");
    return [];
  }
  const params = new URLSearchParams({
    q: input,
    access_token: token,
    country: "us",
    types: "address",
    limit: "7",
    language: "en",
    autocomplete: "true",
  });
  if (opts.sessionToken) params.set("session_token", opts.sessionToken);

  const url = `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    log.error("[PlacesAutocomplete:mapbox] HTTP", { err: response.status });
    return [];
  }
  const data = (await response.json()) as {
    features?: Array<{
      properties?: { full_address?: string; place_formatted?: string; name?: string };
    }>;
  };
  if (!Array.isArray(data.features)) return [];
  return data.features
    .map((f) => f.properties?.full_address || f.properties?.place_formatted || f.properties?.name || "")
    .filter((s) => s.length > 0);
}
