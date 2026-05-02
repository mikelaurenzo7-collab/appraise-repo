/**
 * Street View & Satellite Capture Service
 * ────────────────────────────────────────────────────────────────────────────
 * Captures Street View, Satellite, and Road Map images for properties to
 * enhance PDF reports. Calls Google Maps Platform APIs directly using
 * GOOGLE_MAPS_PLATFORM_API_KEY (no proxy).
 * ────────────────────────────────────────────────────────────────────────────
 */
import { ENV } from "./env";
import { storagePut } from "../storage";
import { scopedLogger } from "./logger";

const log = scopedLogger("StreetViewCapture");

const GOOGLE_BASE_URL = "https://maps.googleapis.com";

function googleUrl(endpoint: string, params: Record<string, string | number>): string {
  const apiKey = ENV.googleMapsApiKey;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_PLATFORM_API_KEY is not configured");
  }
  const p = new URLSearchParams({
    key: apiKey,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  return `${GOOGLE_BASE_URL}${endpoint}?${p.toString()}`;
}

export interface StreetViewCaptureOptions {
  address: string;
  size?: string;    // WIDTHxHEIGHT e.g. "600x400"
  heading?: number; // 0-360
  pitch?: number;   // -90 to 90
  fov?: number;     // 10-120
}

export interface CapturedImage {
  url: string;
  address: string;
  type: "street_view" | "satellite" | "roadmap";
  direction?: string;
}

// ─── Street View ─────────────────────────────────────────────────────────────

/**
 * Capture a single Street View image and upload to S3.
 * Returns a public S3 URL so it can be embedded in PDFs.
 */
export async function captureStreetView(
  options: StreetViewCaptureOptions
): Promise<CapturedImage | null> {
  try {
    const { address, size = "600x400", heading = 0, pitch = 0, fov = 90 } = options;

    // Check metadata first to confirm Street View is available
    const metaUrl = googleUrl("/maps/api/streetview/metadata", { location: address });
    const metaRes = await fetch(metaUrl, { signal: AbortSignal.timeout(8000) });
    if (!metaRes.ok) return null;
    const meta = await metaRes.json() as { status?: string };
    if (meta.status !== "OK") {
      log.info(`[StreetView] No coverage for: ${address} (status: ${meta.status})`);
      return null;
    }

    const imageUrl = googleUrl("/maps/api/streetview", {
      location: address,
      size,
      heading,
      pitch,
      fov,
    });
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) return null;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const key = `street-view/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { url } = await storagePut(key, buffer, "image/jpeg");

    return { url, address, type: "street_view" };
  } catch (error) {
    log.error("[StreetViewCapture] Error:", { err: error instanceof Error ? error.message : error });
    return null;
  }
}

/**
 * Capture front, right, back, and left Street View angles in parallel.
 * Returns a map of direction → public S3 URL.
 */
export async function captureMultipleAngles(
  address: string
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  // Check availability once before firing 4 requests
  const metaUrl = googleUrl("/maps/api/streetview/metadata", { location: address });
  try {
    const metaRes = await fetch(metaUrl, { signal: AbortSignal.timeout(8000) });
    if (metaRes.ok) {
      const meta = await metaRes.json() as { status?: string };
      if (meta.status !== "OK") {
        log.info(`[StreetView] No coverage for: ${address}`);
        return results;
      }
    }
  } catch {
    return results;
  }

  const angles: Record<string, number> = { front: 0, right: 90, back: 180, left: 270 };
  await Promise.all(
    Object.entries(angles).map(async ([direction, heading]) => {
      const capture = await captureStreetView({ address, size: "600x400", heading, pitch: 0, fov: 90 });
      if (capture) results[direction] = capture.url;
    })
  );

  return results;
}

// ─── Satellite & Road Map ─────────────────────────────────────────────────────

/**
 * Capture a satellite image of the property from above.
 * Zoom 19 = parcel-level detail.
 */
export async function captureSatelliteImage(
  address: string,
  zoom = 19,
  size = "640x480"
): Promise<CapturedImage | null> {
  try {
    const imageUrl = googleUrl("/maps/api/staticmap", {
      center: address,
      zoom,
      size,
      maptype: "satellite",
      markers: `color:red|${address}`,
    });
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) return null;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const key = `satellite/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { url } = await storagePut(key, buffer, "image/png");

    return { url, address, type: "satellite" };
  } catch (error) {
    log.error("[SatelliteCapture] Error:", { err: error instanceof Error ? error.message : error });
    return null;
  }
}

/**
 * Capture a road map image with the property pinned.
 * Zoom 16 = neighborhood context.
 */
export async function captureRoadMapImage(
  address: string,
  zoom = 16,
  size = "640x480"
): Promise<CapturedImage | null> {
  try {
    const imageUrl = googleUrl("/maps/api/staticmap", {
      center: address,
      zoom,
      size,
      maptype: "roadmap",
      markers: `color:red|label:P|${address}`,
    });
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) return null;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const key = `roadmap/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { url } = await storagePut(key, buffer, "image/png");

    return { url, address, type: "roadmap" };
  } catch (error) {
    log.error("[RoadMapCapture] Error:", { err: error instanceof Error ? error.message : error });
    return null;
  }
}

// ─── Geocoding ───────────────────────────────────────────────────────────────

export interface GeocodedAddress {
  lat: number;
  lng: number;
  formattedAddress: string;
  streetNumber?: string;
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  stateCode?: string;
  zipCode?: string;
  country?: string;
}

/**
 * Geocode an address and return structured components.
 * Used to auto-fill city/county/state/zip after autocomplete selection.
 */
export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  try {
    const url = googleUrl("/maps/api/geocode/json", { address });
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const data = await res.json() as {
      status?: string;
      results?: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
        address_components: Array<{ long_name: string; short_name: string; types: string[] }>;
      }>;
    };

    if (data.status !== "OK" || !data.results?.length) return null;

    const result = data.results[0];
    const comps = result.address_components;

    const get = (type: string, short = false) =>
      comps.find(c => c.types.includes(type))?.[short ? "short_name" : "long_name"];

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      streetNumber: get("street_number"),
      street: get("route"),
      city: get("locality") || get("sublocality") || get("neighborhood"),
      county: get("administrative_area_level_2"),
      state: get("administrative_area_level_1"),
      stateCode: get("administrative_area_level_1", true),
      zipCode: get("postal_code"),
      country: get("country", true),
    };
  } catch (error) {
    log.error("[Geocode] Error:", { err: error instanceof Error ? error.message : error });
    return null;
  }
}

// ─── All-in-one property imagery capture ─────────────────────────────────────

export interface PropertyImagery {
  streetViewFront?: string;
  streetViewAngles?: Record<string, string>;
  satellite?: string;
  roadmap?: string;
  geocoded?: GeocodedAddress;
}

/**
 * Capture all imagery for a property in parallel.
 * Used by the analysis pipeline to enrich PDF reports.
 */
export async function capturePropertyImagery(address: string): Promise<PropertyImagery> {
  const [streetView, satellite, roadmap, geocoded] = await Promise.allSettled([
    captureStreetView({ address, size: "640x480", heading: 0 }),
    captureSatelliteImage(address, 19, "640x480"),
    captureRoadMapImage(address, 16, "640x480"),
    geocodeAddress(address),
  ]);

  return {
    streetViewFront: streetView.status === "fulfilled" ? streetView.value?.url : undefined,
    satellite: satellite.status === "fulfilled" ? satellite.value?.url : undefined,
    roadmap: roadmap.status === "fulfilled" ? roadmap.value?.url : undefined,
    geocoded: geocoded.status === "fulfilled" ? (geocoded.value ?? undefined) : undefined,
  };
}
