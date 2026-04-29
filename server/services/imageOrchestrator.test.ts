/**
 * Image Orchestrator Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests strategic image placement within report sections.
 */

import { describe, it, expect } from "vitest";
import {
  orchestrateImagePlacement,
  getImagePlacementForSection,
  getAllImagePlacements,
  sectionHasImages,
  getImagesForPlacement,
  generateImageRenderingInstructions,
  validateImageAssets,
  getImageSummary,
  type ImageAssets,
} from "./imageOrchestrator";

describe("Image Orchestrator", () => {
  // ─── Test Data ──────────────────────────────────────────────────────────

  const mockImageAssets: ImageAssets = {
    streetViewBuf: Buffer.from("street-view-data"),
    satelliteBuf: Buffer.from("satellite-data"),
    roadmapBuf: Buffer.from("roadmap-data"),
  };

  const emptyImageAssets: ImageAssets = {
    streetViewBuf: null,
    satelliteBuf: null,
    roadmapBuf: null,
  };

  const partialImageAssets: ImageAssets = {
    streetViewBuf: Buffer.from("street-view-data"),
    satelliteBuf: null,
    roadmapBuf: Buffer.from("roadmap-data"),
  };

  const visibleSectionsAll = [
    "executive_summary",
    "user_evidence",
    "market_context",
    "comparable_sales",
    "reconciliation",
    "appeal_summary",
  ];

  const visibleSectionsMinimal = ["executive_summary", "appeal_summary"];

  const visibleSectionsNoMarket = [
    "executive_summary",
    "user_evidence",
    "comparable_sales",
    "reconciliation",
    "appeal_summary",
  ];

  // ─── Test Cases ──────────────────────────────────────────────────────────

  describe("Image Placement Orchestration", () => {
    it("should place all images when all sections visible", () => {
      const sectionVisibility = {
        user_evidence: true,
        market_context: true,
      };

      const config = orchestrateImagePlacement(mockImageAssets, sectionVisibility);

      expect(config.streetViewInEvidence).toBe(true);
      expect(config.aerialInMarketContext).toBe(true);
      expect(config.mapInMarketContext).toBe(true);
    });

    it("should hide street view when user evidence section hidden", () => {
      const sectionVisibility = {
        user_evidence: false,
        market_context: true,
      };

      const config = orchestrateImagePlacement(mockImageAssets, sectionVisibility);

      expect(config.streetViewInEvidence).toBe(false);
      expect(config.aerialInMarketContext).toBe(true);
      expect(config.mapInMarketContext).toBe(true);
    });

    it("should hide aerial and map when market context section hidden", () => {
      const sectionVisibility = {
        user_evidence: true,
        market_context: false,
      };

      const config = orchestrateImagePlacement(mockImageAssets, sectionVisibility);

      expect(config.streetViewInEvidence).toBe(true);
      expect(config.aerialInMarketContext).toBe(false);
      expect(config.mapInMarketContext).toBe(false);
    });

    it("should hide all images when no image assets available", () => {
      const sectionVisibility = {
        user_evidence: true,
        market_context: true,
      };

      const config = orchestrateImagePlacement(emptyImageAssets, sectionVisibility);

      expect(config.streetViewInEvidence).toBe(false);
      expect(config.aerialInMarketContext).toBe(false);
      expect(config.mapInMarketContext).toBe(false);
    });

    it("should handle partial image assets", () => {
      const sectionVisibility = {
        user_evidence: true,
        market_context: true,
      };

      const config = orchestrateImagePlacement(partialImageAssets, sectionVisibility);

      expect(config.streetViewInEvidence).toBe(true); // Has street view
      expect(config.aerialInMarketContext).toBe(false); // No satellite
      expect(config.mapInMarketContext).toBe(true); // Has map
    });
  });

  describe("Section Image Placement", () => {
    it("should place street view at end of user evidence section", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const placement = getImagePlacementForSection("user_evidence", config, mockImageAssets);

      expect(placement.sectionId).toBe("user_evidence");
      expect(placement.images.length).toBe(1);
      expect(placement.images[0].type).toBe("street_view");
      expect(placement.images[0].placement).toBe("end");
    });

    it("should place aerial in middle of market context section", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const placement = getImagePlacementForSection("market_context", config, mockImageAssets);

      const aerialImage = placement.images.find(img => img.type === "aerial");
      expect(aerialImage).toBeDefined();
      expect(aerialImage?.placement).toBe("middle");
    });

    it("should place map at end of market context section", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const placement = getImagePlacementForSection("market_context", config, mockImageAssets);

      const mapImage = placement.images.find(img => img.type === "map");
      expect(mapImage).toBeDefined();
      expect(mapImage?.placement).toBe("end");
    });

    it("should return multiple images for market context section", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const placement = getImagePlacementForSection("market_context", config, mockImageAssets);

      expect(placement.images.length).toBe(2); // Aerial + Map
    });

    it("should return no images for other sections", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const placement = getImagePlacementForSection("comparable_sales", config, mockImageAssets);

      expect(placement.images.length).toBe(0);
    });
  });

  describe("Section Has Images", () => {
    it("should return true for user evidence with street view", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      expect(sectionHasImages("user_evidence", config)).toBe(true);
    });

    it("should return true for market context with images", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      expect(sectionHasImages("market_context", config)).toBe(true);
    });

    it("should return false for sections without images", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      expect(sectionHasImages("comparable_sales", config)).toBe(false);
      expect(sectionHasImages("reconciliation", config)).toBe(false);
    });
  });

  describe("Get Images for Placement", () => {
    it("should get street view for end placement in user evidence", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const images = getImagesForPlacement("user_evidence", "end", config, mockImageAssets);

      expect(images.length).toBe(1);
      expect(images[0].type).toBe("street_view");
      expect(images[0].buffer).toBeDefined();
    });

    it("should get aerial for middle placement in market context", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const images = getImagesForPlacement("market_context", "middle", config, mockImageAssets);

      expect(images.length).toBe(1);
      expect(images[0].type).toBe("aerial");
    });

    it("should get map for end placement in market context", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const images = getImagesForPlacement("market_context", "end", config, mockImageAssets);

      expect(images.length).toBe(1);
      expect(images[0].type).toBe("map");
    });

    it("should return empty array for non-existent placements", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const images = getImagesForPlacement("user_evidence", "middle", config, mockImageAssets);

      expect(images.length).toBe(0);
    });
  });

  describe("Image Rendering Instructions", () => {
    it("should generate instructions for all images", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const instructions = generateImageRenderingInstructions(config, mockImageAssets, visibleSectionsAll);

      expect(instructions.length).toBe(3); // Street view + Aerial + Map
    });

    it("should include correct dimensions for images", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const instructions = generateImageRenderingInstructions(config, mockImageAssets, visibleSectionsAll);

      const streetView = instructions.find(i => i.type === "street_view");
      expect(streetView?.width).toBe(520);
      expect(streetView?.height).toBeCloseTo(520 * 0.55, 0);

      const map = instructions.find(i => i.type === "map");
      expect(map?.width).toBe(520);
      expect(map?.height).toBeCloseTo(520 * 0.65, 0);
    });

    it("should not generate instructions for hidden sections", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const instructions = generateImageRenderingInstructions(config, mockImageAssets, visibleSectionsNoMarket);

      expect(instructions.length).toBe(1); // Only street view
      expect(instructions[0].type).toBe("street_view");
    });
  });

  describe("Image Asset Validation", () => {
    it("should validate complete image assets", () => {
      const validation = validateImageAssets(mockImageAssets);

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.warnings.length).toBe(0);
    });

    it("should warn about missing images", () => {
      const validation = validateImageAssets(emptyImageAssets);

      expect(validation.isValid).toBe(true); // Still valid, just warnings
      expect(validation.warnings.length).toBe(3);
      expect(validation.warnings).toContain("No street view image available");
      expect(validation.warnings).toContain("No satellite/aerial image available");
      expect(validation.warnings).toContain("No neighborhood map available");
    });

    it("should warn about partial images", () => {
      const validation = validateImageAssets(partialImageAssets);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBe(1);
      expect(validation.warnings).toContain("No satellite/aerial image available");
    });
  });

  describe("Image Summary", () => {
    it("should generate summary for all images", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const summary = getImageSummary(config);

      expect(summary).toContain("Street View");
      expect(summary).toContain("Aerial View");
      expect(summary).toContain("Neighborhood Map");
    });

    it("should generate summary for partial images", () => {
      const config = orchestrateImagePlacement(partialImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const summary = getImageSummary(config);

      expect(summary).toContain("Street View");
      expect(summary).toContain("Neighborhood Map");
      expect(summary).not.toContain("Aerial View");
    });

    it("should indicate no images when none available", () => {
      const config = orchestrateImagePlacement(emptyImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const summary = getImageSummary(config);

      expect(summary).toBe("No images included in report");
    });
  });

  describe("All Image Placements", () => {
    it("should get all placements for visible sections", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const placements = getAllImagePlacements(config, mockImageAssets, visibleSectionsAll);

      expect(placements.size).toBe(2); // user_evidence + market_context
      expect(placements.has("user_evidence")).toBe(true);
      expect(placements.has("market_context")).toBe(true);
    });

    it("should exclude hidden sections from placements", () => {
      const config = orchestrateImagePlacement(mockImageAssets, {
        user_evidence: true,
        market_context: true,
      });

      const placements = getAllImagePlacements(config, mockImageAssets, visibleSectionsNoMarket);

      expect(placements.size).toBe(1); // Only user_evidence
      expect(placements.has("user_evidence")).toBe(true);
      expect(placements.has("market_context")).toBe(false);
    });
  });
});
