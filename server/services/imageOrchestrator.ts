import { scopedLogger } from "../_core/logger";

const log = scopedLogger("ImageOrchestrator");
/**
 * Image Orchestrator
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages strategic placement of images (street view, aerial, map) within
 * report sections. Images are integrated into the evidence-first narrative
 * rather than appearing as separate sections.
 */

export interface ImageAssets {
  streetViewBuf?: Buffer | null;
  satelliteBuf?: Buffer | null;
  roadmapBuf?: Buffer | null;
}

export interface ImagePlacementConfig {
  streetViewInEvidence: boolean;
  aerialInMarketContext: boolean;
  mapInMarketContext: boolean;
}

export interface SectionImagePlacement {
  sectionId: string;
  images: Array<{
    type: "street_view" | "aerial" | "map";
    placement: "start" | "middle" | "end";
    description: string;
    caption: string;
  }>;
}

/**
 * Determines which images to show and where to place them
 */
export function orchestrateImagePlacement(
  imageAssets: ImageAssets,
  sectionVisibility: Record<string, boolean>
): ImagePlacementConfig {
  return {
    // Street view appears in User Evidence section
    streetViewInEvidence: !!imageAssets.streetViewBuf && sectionVisibility.user_evidence,

    // Aerial appears in Market Context section
    aerialInMarketContext: !!imageAssets.satelliteBuf && sectionVisibility.market_context,

    // Map appears in Market Context section
    mapInMarketContext: !!imageAssets.roadmapBuf && sectionVisibility.market_context,
  };
}

/**
 * Gets image placement details for a specific section
 */
export function getImagePlacementForSection(
  sectionId: string,
  config: ImagePlacementConfig,
  imageAssets: ImageAssets
): SectionImagePlacement {
  const images: SectionImagePlacement["images"] = [];

  if (sectionId === "user_evidence" && config.streetViewInEvidence && imageAssets.streetViewBuf) {
    images.push({
      type: "street_view",
      placement: "end",
      description: "Street-level view of the property from public right-of-way",
      caption: "Street View - Front Elevation",
    });
  }

  if (sectionId === "market_context") {
    if (config.aerialInMarketContext && imageAssets.satelliteBuf) {
      images.push({
        type: "aerial",
        placement: "middle",
        description: "Aerial perspective showing lot size, building footprint, and site improvements",
        caption: "Aerial / Satellite View",
      });
    }

    if (config.mapInMarketContext && imageAssets.roadmapBuf) {
      images.push({
        type: "map",
        placement: "end",
        description: "Neighborhood location map showing proximity to amenities and market context",
        caption: "Neighborhood Location Map",
      });
    }
  }

  return {
    sectionId,
    images,
  };
}

/**
 * Gets all image placements for report generation
 */
export function getAllImagePlacements(
  config: ImagePlacementConfig,
  imageAssets: ImageAssets,
  visibleSections: string[]
): Map<string, SectionImagePlacement> {
  const placements = new Map<string, SectionImagePlacement>();

  for (const sectionId of visibleSections) {
    const placement = getImagePlacementForSection(sectionId, config, imageAssets);
    if (placement.images.length > 0) {
      placements.set(sectionId, placement);
    }
  }

  return placements;
}

/**
 * Checks if a section has images to render
 */
export function sectionHasImages(
  sectionId: string,
  config: ImagePlacementConfig
): boolean {
  if (sectionId === "user_evidence") {
    return config.streetViewInEvidence;
  }

  if (sectionId === "market_context") {
    return config.aerialInMarketContext || config.mapInMarketContext;
  }

  return false;
}

/**
 * Gets images for a specific section and placement
 */
export function getImagesForPlacement(
  sectionId: string,
  placement: "start" | "middle" | "end",
  config: ImagePlacementConfig,
  imageAssets: ImageAssets
): Array<{
  type: "street_view" | "aerial" | "map";
  description: string;
  caption: string;
  buffer: Buffer;
}> {
  const sectionPlacement = getImagePlacementForSection(sectionId, config, imageAssets);

  return sectionPlacement.images
    .filter(img => img.placement === placement)
    .map(img => {
      let buffer: Buffer | undefined;

      if (img.type === "street_view") {
        buffer = imageAssets.streetViewBuf || undefined;
      } else if (img.type === "aerial") {
        buffer = imageAssets.satelliteBuf || undefined;
      } else if (img.type === "map") {
        buffer = imageAssets.roadmapBuf || undefined;
      }

      return {
        type: img.type,
        description: img.description,
        caption: img.caption,
        buffer: buffer!,
      };
    })
    .filter(img => !!img.buffer);
}

/**
 * Generates image rendering instructions for PDF
 */
export function generateImageRenderingInstructions(
  config: ImagePlacementConfig,
  imageAssets: ImageAssets,
  visibleSections: string[]
): Array<{
  sectionId: string;
  placement: "start" | "middle" | "end";
  type: "street_view" | "aerial" | "map";
  description: string;
  caption: string;
  width: number;
  height: number;
}> {
  const instructions: Array<{
    sectionId: string;
    placement: "start" | "middle" | "end";
    type: "street_view" | "aerial" | "map";
    description: string;
    caption: string;
    width: number;
    height: number;
  }> = [];

  const contentWidth = 520; // Standard content width (8.5" - 1" margins)

  // Street view in user evidence
  if (config.streetViewInEvidence && imageAssets.streetViewBuf && visibleSections.includes("user_evidence")) {
    instructions.push({
      sectionId: "user_evidence",
      placement: "end",
      type: "street_view",
      description: "Street-level view of the property from public right-of-way",
      caption: "Street View - Front Elevation",
      width: contentWidth,
      height: Math.round(contentWidth * 0.55),
    });
  }

  // Aerial in market context
  if (config.aerialInMarketContext && imageAssets.satelliteBuf && visibleSections.includes("market_context")) {
    instructions.push({
      sectionId: "market_context",
      placement: "middle",
      type: "aerial",
      description: "Aerial perspective showing lot size, building footprint, and site improvements",
      caption: "Aerial / Satellite View",
      width: contentWidth,
      height: Math.round(contentWidth * 0.55),
    });
  }

  // Map in market context
  if (config.mapInMarketContext && imageAssets.roadmapBuf && visibleSections.includes("market_context")) {
    instructions.push({
      sectionId: "market_context",
      placement: "end",
      type: "map",
      description: "Neighborhood location map showing proximity to amenities and market context",
      caption: "Neighborhood Location Map",
      width: contentWidth,
      height: Math.round(contentWidth * 0.65),
    });
  }

  return instructions;
}

/**
 * Logging function for image placement
 */
export function logImagePlacement(
  config: ImagePlacementConfig,
  visibleSections: string[],
  reportId: string
): void {
  log.info(`\n[ImageOrchestrator] Report ${reportId}`);
  log.info(`  Street View in Evidence: ${config.streetViewInEvidence}`);
  log.info(`  Aerial in Market Context: ${config.aerialInMarketContext}`);
  log.info(`  Map in Market Context: ${config.mapInMarketContext}`);

  const placements = [];
  if (config.streetViewInEvidence) placements.push("Street View → User Evidence");
  if (config.aerialInMarketContext) placements.push("Aerial → Market Context");
  if (config.mapInMarketContext) placements.push("Map → Market Context");

  if (placements.length > 0) {
    log.info(`  Placements: ${placements.join(", ")}`);
  } else {
    log.info(`  No images to render`);
  }

  log.info("");
}

/**
 * Validates image assets
 */
export function validateImageAssets(imageAssets: ImageAssets): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!imageAssets.streetViewBuf) {
    warnings.push("No street view image available");
  }

  if (!imageAssets.satelliteBuf) {
    warnings.push("No satellite/aerial image available");
  }

  if (!imageAssets.roadmapBuf) {
    warnings.push("No neighborhood map available");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets image summary for report
 */
export function getImageSummary(config: ImagePlacementConfig): string {
  const images: string[] = [];

  if (config.streetViewInEvidence) images.push("Street View");
  if (config.aerialInMarketContext) images.push("Aerial View");
  if (config.mapInMarketContext) images.push("Neighborhood Map");

  if (images.length === 0) {
    return "No images included in report";
  }

  return `Images: ${images.join(", ")}`;
}
