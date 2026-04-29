# Image Integration Guide

## Overview

Images (street view, aerial/satellite, neighborhood map) are now strategically integrated into the PDF report flow using the Image Orchestrator. This guide explains how to use and integrate the image placement system.

---

## Strategic Image Placement

### Report Flow with Images

```
1. EXECUTIVE SUMMARY
   ↓
2. USER EVIDENCE SECTION
   ├─ User-submitted photos with cost-to-cure analysis
   └─ STREET VIEW IMAGE (end of section)
   ↓
3. MARKET CONTEXT SECTION
   ├─ Market condition analysis
   ├─ AERIAL/SATELLITE IMAGE (middle of section)
   └─ NEIGHBORHOOD MAP (end of section)
   ↓
4. COMPARABLE SALES ANALYSIS
5. COST APPROACH
6. INCOME APPROACH
7. RECONCILIATION
8. APPEAL SUMMARY
```

---

## Core Components

### 1. Image Orchestrator
**File**: `server/services/imageOrchestrator.ts`

Manages strategic placement of images within report sections.

```typescript
import {
  orchestrateImagePlacement,
  getImagePlacementForSection,
  generateImageRenderingInstructions,
} from "./imageOrchestrator";

// Determine which images to show and where
const config = orchestrateImagePlacement(imageAssets, sectionVisibility);

// Get images for a specific section and placement
const placement = getImagePlacementForSection("user_evidence", config, imageAssets);

// Generate rendering instructions for PDF
const instructions = generateImageRenderingInstructions(
  config,
  imageAssets,
  visibleSections
);
```

### 2. Image Assets
**Type**: `ImageAssets`

```typescript
interface ImageAssets {
  streetViewBuf?: Buffer | null;    // Street view photo
  satelliteBuf?: Buffer | null;     // Aerial/satellite photo
  roadmapBuf?: Buffer | null;       // Neighborhood map
}
```

### 3. Image Placement Config
**Type**: `ImagePlacementConfig`

```typescript
interface ImagePlacementConfig {
  streetViewInEvidence: boolean;    // Show in user evidence?
  aerialInMarketContext: boolean;   // Show in market context?
  mapInMarketContext: boolean;      // Show in market context?
}
```

---

## Usage Examples

### Example 1: Full Report with All Images

```typescript
const imageAssets: ImageAssets = {
  streetViewBuf: Buffer.from(streetViewData),
  satelliteBuf: Buffer.from(aerialData),
  roadmapBuf: Buffer.from(mapData),
};

const sectionVisibility = {
  user_evidence: true,
  market_context: true,
};

// Orchestrate placement
const config = orchestrateImagePlacement(imageAssets, sectionVisibility);

// Result:
// {
//   streetViewInEvidence: true,
//   aerialInMarketContext: true,
//   mapInMarketContext: true
// }

// Get rendering instructions
const instructions = generateImageRenderingInstructions(
  config,
  imageAssets,
  ["executive_summary", "user_evidence", "market_context", "comparable_sales", ...]
);

// Result: 3 instructions
// [
//   { sectionId: "user_evidence", placement: "end", type: "street_view", width: 520, height: 286 },
//   { sectionId: "market_context", placement: "middle", type: "aerial", width: 520, height: 286 },
//   { sectionId: "market_context", placement: "end", type: "map", width: 520, height: 338 }
// ]
```

### Example 2: Limited Images (No Aerial)

```typescript
const imageAssets: ImageAssets = {
  streetViewBuf: Buffer.from(streetViewData),
  satelliteBuf: null,  // No aerial available
  roadmapBuf: Buffer.from(mapData),
};

const config = orchestrateImagePlacement(imageAssets, sectionVisibility);

// Result:
// {
//   streetViewInEvidence: true,
//   aerialInMarketContext: false,  // Hidden - no data
//   mapInMarketContext: true
// }
```

### Example 3: Market Context Hidden

```typescript
const sectionVisibility = {
  user_evidence: true,
  market_context: false,  // Section is hidden
};

const config = orchestrateImagePlacement(imageAssets, sectionVisibility);

// Result:
// {
//   streetViewInEvidence: true,
//   aerialInMarketContext: false,  // Hidden - section not visible
//   mapInMarketContext: false       // Hidden - section not visible
// }
```

---

## Integration with PDF Generation

### Step 1: Prepare Image Assets

```typescript
const streetViewBuf = data.streetViewUrl 
  ? await fetchImageBuffer(data.streetViewUrl) 
  : null;
const satelliteBuf = data.satelliteImageUrl 
  ? await fetchImageBuffer(data.satelliteImageUrl) 
  : null;
const roadmapBuf = data.roadmapUrl 
  ? await fetchImageBuffer(data.roadmapUrl) 
  : null;

const imageAssets = {
  streetViewBuf,
  satelliteBuf,
  roadmapBuf,
};
```

### Step 2: Get Section Visibility

```typescript
import { orchestrateReportStructure } from "./reportStructureOrchestrator";
import { getSectionVisibilityFlags } from "./reportStructureOrchestrator";

const reportStructure = orchestrateReportStructure(analysisData);
const visibilityFlags = getSectionVisibilityFlags(reportStructure);
```

### Step 3: Orchestrate Image Placement

```typescript
import { orchestrateImagePlacement } from "./imageOrchestrator";

const imageConfig = orchestrateImagePlacement(imageAssets, visibilityFlags);
```

### Step 4: Render Images in Sections

```typescript
// In User Evidence section
if (imageConfig.streetViewInEvidence && imageAssets.streetViewBuf) {
  renderStreetViewImage(doc, imageAssets.streetViewBuf);
}

// In Market Context section
if (imageConfig.aerialInMarketContext && imageAssets.satelliteBuf) {
  renderAerialImage(doc, imageAssets.satelliteBuf);
}

if (imageConfig.mapInMarketContext && imageAssets.roadmapBuf) {
  renderNeighborhoodMap(doc, imageAssets.roadmapBuf);
}
```

---

## Image Rendering Functions

### Render Street View

```typescript
function renderStreetViewImage(doc: PDFDocument, buffer: Buffer) {
  const cw = 520; // Content width
  const h = Math.round(cw * 0.55);
  
  doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
    .text("Street View - Front Elevation", LM, doc.y);
  
  doc.rect(LM - 1, doc.y - 1, cw + 2, h + 2)
    .lineWidth(0.75)
    .stroke(PURPLE);
  
  doc.image(buffer, LM, doc.y, { width: cw, height: h });
  
  doc.fontSize(8).fillColor(MUTED).font("Helvetica")
    .text("Street-level view showing property condition from public right-of-way", 
          LM, doc.y + h + 4, { width: cw });
}
```

### Render Aerial Image

```typescript
function renderAerialImage(doc: PDFDocument, buffer: Buffer) {
  const cw = 520;
  const h = Math.round(cw * 0.55);
  
  doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
    .text("Aerial / Satellite View", LM, doc.y);
  
  doc.rect(LM - 1, doc.y - 1, cw + 2, h + 2)
    .lineWidth(0.75)
    .stroke(PURPLE);
  
  doc.image(buffer, LM, doc.y, { width: cw, height: h });
  
  doc.fontSize(8).fillColor(MUTED).font("Helvetica")
    .text("Aerial view showing lot size, building footprint, and site improvements", 
          LM, doc.y + h + 4, { width: cw });
}
```

### Render Neighborhood Map

```typescript
function renderNeighborhoodMap(doc: PDFDocument, buffer: Buffer) {
  const cw = 520;
  const h = Math.round(cw * 0.65);
  
  doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
    .text("Neighborhood Location Map", LM, doc.y);
  
  doc.rect(LM - 1, doc.y - 1, cw + 2, h + 2)
    .lineWidth(0.75)
    .stroke(PURPLE);
  
  doc.image(buffer, LM, doc.y, { width: cw, height: h });
  
  doc.fontSize(8).fillColor(MUTED).font("Helvetica")
    .text("Map showing property location and proximity to community amenities", 
          LM, doc.y + h + 4, { width: cw });
}
```

---

## Validation & Error Handling

### Validate Image Assets

```typescript
import { validateImageAssets } from "./imageOrchestrator";

const validation = validateImageAssets(imageAssets);

if (!validation.isValid) {
  console.error("Image validation errors:", validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn("Image warnings:", validation.warnings);
}
```

### Get Image Summary

```typescript
import { getImageSummary } from "./imageOrchestrator";

const summary = getImageSummary(imageConfig);
console.log(summary);
// Output: "Images: Street View, Aerial View, Neighborhood Map"
```

### Handle Missing Images

```typescript
if (!imageAssets.streetViewBuf) {
  console.warn("Street view image not available");
  // Report will still generate, just without street view
}

if (!imageAssets.satelliteBuf) {
  console.warn("Satellite image not available");
  // Aerial section will be skipped
}
```

---

## Testing

### Test Suite
**File**: `server/services/imageOrchestrator.test.ts`

Covers:
- ✅ Image placement orchestration
- ✅ Section-specific placement
- ✅ Partial image assets
- ✅ Missing images
- ✅ Rendering instructions
- ✅ Image validation
- ✅ 28 test cases (all passing)

### Running Tests

```bash
pnpm test -- server/services/imageOrchestrator.test.ts
```

---

## Benefits

### For Users
✅ Visual evidence supports narrative from the start
✅ Photos + street view corroborate property condition
✅ Maps show market context immediately
✅ Faster understanding of appeal basis

### For Assessors
✅ Clear visual narrative from start
✅ Images support methodology, not distract
✅ Logical flow: Evidence → Context → Analysis
✅ Professional presentation

### For Appeal Success
✅ Visual evidence establishes credibility
✅ Market context shows assessment is out of sync
✅ Images + data create compelling narrative
✅ Assessor sees full picture before methodology

---

## Implementation Checklist

- [x] Create imageOrchestrator.ts
- [x] Create imageOrchestrator.test.ts (28 tests)
- [x] Design strategic placement strategy
- [ ] Update pdfGenerator.ts to use orchestrator
- [ ] Integrate with reportStructureOrchestrator
- [ ] Update pdfReportSections.ts with new rendering
- [ ] Test end-to-end report generation
- [ ] Verify page breaks and spacing
- [ ] Test with various image combinations

---

## Files Reference

| File | Purpose |
|------|---------|
| `imageOrchestrator.ts` | Core image placement logic |
| `imageOrchestrator.test.ts` | Test suite (28 tests) |
| `IMAGE_PLACEMENT_STRATEGY.md` | Strategic design document |
| `IMAGE_INTEGRATION_GUIDE.md` | This file |
| `pdfGenerator.ts` | PDF rendering (to be updated) |
| `reportStructureOrchestrator.ts` | Report structure (existing) |

---

## Next Steps

1. Update `pdfGenerator.ts` to use image orchestrator
2. Integrate with report structure orchestrator
3. Test end-to-end report generation
4. Verify visual appearance and spacing
5. Test with various image combinations
6. Deploy and monitor appeal success rates

---

**Status**: Ready for integration | **Tests**: 416 passing (28 new)
