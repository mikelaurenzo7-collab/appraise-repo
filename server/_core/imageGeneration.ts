/**
 * Image generation helper using internal ImageService
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";
import { validateAudioUrl } from "./voiceTranscription"; // Re-use SSRF URL validator

function validateImageUrl(url: string): { ok: true } | { ok: false; error: string } {
  // Use the same SSRF validator as voice transcription
  return validateAudioUrl(url);
}

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

export async function generateImage(
  _options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  // Image generation was previously backed by the Manus Forge ImageService.
  // It is not yet wired to a replacement provider in this deployment.
  throw new Error(
    "Image generation is not available in this deployment. Configure a provider (e.g. OpenAI Images / Gemini) to enable it."
  );
  // Unreachable — kept so callers in the legacy code path still type-check.
  // eslint-disable-next-line no-unreachable
  const response = await fetch("about:blank", { method: "POST" });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    image: {
      b64Json: string;
      mimeType: string;
    };
  };
  const base64Data = result.image.b64Json;
  const buffer = Buffer.from(base64Data, "base64");

  // Save to S3
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    result.image.mimeType
  );
  return {
    url,
  };
}
