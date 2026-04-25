/**
 * Street View Capture Service
 * Captures Street View images for properties to enhance PDF reports
 * Uses Google Street View Static API via Forge proxy
 */

import axios from "axios";

const FORGE_BASE_URL = process.env.BUILT_IN_FORGE_API_URL || "https://forge.butterfly-effect.dev";
const API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

export interface StreetViewCaptureOptions {
  address: string;
  size?: string; // WIDTHxHEIGHT, e.g., "600x400"
  heading?: number; // 0-360, direction camera faces
  pitch?: number; // -90 to 90, vertical angle
  fov?: number; // 10-120, field of view
}

/**
 * Capture Street View image for a property address
 * Returns URL to the captured image
 */
export async function captureStreetView(
  options: StreetViewCaptureOptions
): Promise<{ url: string; address: string } | null> {
  try {
    const { address, size = "600x400", heading = 0, pitch = 0, fov = 90 } = options;

    const params = new URLSearchParams({
      location: address,
      size,
      heading: String(heading),
      pitch: String(pitch),
      fov: String(fov),
    });

    const url = `${FORGE_BASE_URL}/v1/maps/proxy/maps/api/streetview?${params.toString()}`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      timeout: 10000,
      responseType: "arraybuffer",
    });

    if (response.status === 200) {
      // Return the image URL (the proxy returns the image directly)
      return {
        url: `${FORGE_BASE_URL}/v1/maps/proxy/maps/api/streetview?${params.toString()}`,
        address,
      };
    }

    return null;
  } catch (error) {
    console.error("[StreetViewCapture] Error:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Capture multiple Street View angles for a property
 * Returns URLs for front, left, right, and back views
 */
export async function captureMultipleAngles(
  address: string
): Promise<Record<string, string> | null> {
  try {
    const angles = {
      front: 0,
      left: 270,
      right: 90,
      back: 180,
    };

    const results: Record<string, string> = {};

    for (const [direction, heading] of Object.entries(angles)) {
      const capture = await captureStreetView({
        address,
        size: "400x300",
        heading: Number(heading),
        pitch: 0,
        fov: 90,
      });

      if (capture) {
        results[direction] = capture.url;
      }
    }

    return Object.keys(results).length > 0 ? results : null;
  } catch (error) {
    console.error("[StreetViewCapture:multipleAngles] Error:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get Street View metadata (availability, copyright, etc.)
 */
export async function getStreetViewMetadata(address: string): Promise<any> {
  try {
    const params = new URLSearchParams({
      location: address,
    });

    const url = `${FORGE_BASE_URL}/v1/maps/proxy/maps/api/streetview/metadata?${params.toString()}`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      timeout: 10000,
    });

    return response.data;
  } catch (error) {
    console.error("[StreetViewMetadata] Error:", error instanceof Error ? error.message : error);
    return null;
  }
}
