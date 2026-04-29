# Strategic Image Placement in Reports

## Overview

Images (street view, aerial/satellite, neighborhood map) are now strategically integrated into the report flow to support the evidence-first narrative and maximize appeal strength.

---

## Strategic Image Placement

### NEW STRUCTURE

```
1. EXECUTIVE SUMMARY
   ↓
2. USER EVIDENCE SECTION
   ├─ User-submitted photos with cost-to-cure analysis
   └─ STREET VIEW IMAGE
      (Shows property front elevation, condition from public perspective)
   ↓
3. MARKET CONTEXT SECTION
   ├─ Market condition analysis
   ├─ AERIAL/SATELLITE IMAGE
   │  (Shows lot size, building footprint, site improvements, density)
   └─ NEIGHBORHOOD MAP
      (Shows location, proximity to amenities, market context)
   ↓
4. COMPARABLE SALES ANALYSIS
   ↓
5. COST APPROACH
   ↓
6. INCOME APPROACH
   ↓
7. RECONCILIATION
   ↓
8. APPEAL SUMMARY
```

---

## Why This Placement?

### Street View → User Evidence Section

**Rationale**: 
- Shows property condition from public perspective
- Complements user-submitted photos
- Establishes credibility of property description
- Bridges between user photos and market analysis

**Placement**: End of User Evidence section
**Context**: "Here's what the property looks like from the street, corroborating the user's photos"

### Aerial/Satellite → Market Context Section

**Rationale**:
- Shows lot size and building footprint
- Demonstrates site improvements and density
- Provides geographic context for market analysis
- Supports comparable sales selection (similar neighborhoods)

**Placement**: Middle of Market Context section
**Context**: "This is the property's location in the market, showing its characteristics relative to surrounding properties"

### Neighborhood Map → Market Context Section

**Rationale**:
- Shows proximity to amenities (schools, parks, commercial)
- Illustrates neighborhood character and development patterns
- Supports market value determination
- Explains why comparable sales were selected

**Placement**: End of Market Context section
**Context**: "This is the neighborhood context that influences market value"

---

## Visual Flow

### User Evidence Section
```
┌─────────────────────────────────────────┐
│ USER-PROVIDED EVIDENCE & PHOTOS         │
├─────────────────────────────────────────┤
│ • Photo 1: Roof damage ($5k to cure)    │
│ • Photo 2: Foundation crack ($8k)       │
│ • Photo 3: HVAC age ($3k)               │
│                                         │
│ Total Cost-to-Cure: $16,000             │
│ Impact on Value: -$24,000               │
├─────────────────────────────────────────┤
│ STREET VIEW - Front Elevation           │
│ [Full-width image]                      │
│ "Shows property condition from street"  │
└─────────────────────────────────────────┘
```

### Market Context Section
```
┌─────────────────────────────────────────┐
│ MARKET CONTEXT & TRENDS                 │
├─────────────────────────────────────────┤
│ Market Condition: Balanced              │
│ Appreciation Rate: 3.5% YoY             │
│ Median Price: $420,000                  │
│ Days on Market: 45 days                 │
├─────────────────────────────────────────┤
│ AERIAL VIEW - Property & Surroundings   │
│ [Full-width image]                      │
│ "Shows lot size, building footprint"    │
├─────────────────────────────────────────┤
│ NEIGHBORHOOD MAP - Location Context     │
│ [Full-width image]                      │
│ "Shows proximity to amenities"          │
└─────────────────────────────────────────┘
```

---

## Implementation Details

### Image Visibility Logic

Images are shown based on:

1. **Street View**
   - Show if: User Evidence section is visible AND streetViewBuf available
   - Hide if: No street view image OR User Evidence section filtered out

2. **Aerial/Satellite**
   - Show if: Market Context section is visible AND satelliteBuf available
   - Hide if: No satellite image OR Market Context section filtered out

3. **Neighborhood Map**
   - Show if: Market Context section is visible AND roadmapBuf available
   - Hide if: No map image OR Market Context section filtered out

### Page Management

- **Street View**: Placed at end of User Evidence section (may trigger page break)
- **Aerial/Satellite**: Placed in middle of Market Context section (may trigger page break)
- **Neighborhood Map**: Placed at end of Market Context section (may trigger page break)

### Image Sizing

- **Street View**: Full content width (cw), height = cw × 0.55
- **Aerial/Satellite**: Full content width (cw), height = cw × 0.55
- **Neighborhood Map**: Full content width (cw), height = cw × 0.65

---

## Benefits

### For Users
✅ Visual evidence supports narrative early
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

## Section Visibility Integration

Images follow the same visibility rules as their parent sections:

```typescript
// If User Evidence section is hidden, street view is also hidden
if (visibilityFlags.user_evidence) {
  renderStreetView(); // Show street view
}

// If Market Context section is hidden, aerial and map are also hidden
if (visibilityFlags.market_context) {
  renderAerialView();
  renderNeighborhoodMap();
}
```

---

## Example Report Flows

### Scenario 1: Full Residential Report
```
1. Executive Summary
2. User Evidence + Street View
3. Market Context + Aerial + Map
4. Comparable Sales
5. Cost Approach
6. Reconciliation
7. Appeal Summary
```

### Scenario 2: Limited Data Report
```
1. Executive Summary
2. User Evidence + Street View
3. Cost Approach
4. Appeal Summary
```
(Market Context section hidden → no aerial or map)

### Scenario 3: Income Property Report
```
1. Executive Summary
2. Market Context + Aerial + Map
3. Comparable Sales
4. Income Approach
5. Reconciliation
6. Appeal Summary
```
(No user photos → no street view)

---

## Implementation Checklist

- [ ] Create imageOrchestrator.ts for image placement logic
- [ ] Update reportStructureOrchestrator.ts to include image visibility
- [ ] Modify pdfGenerator.ts to remove old image sections
- [ ] Create renderStreetViewInEvidence() function
- [ ] Create renderAerialInMarketContext() function
- [ ] Create renderMapInMarketContext() function
- [ ] Update pdfReportSections.ts with new image rendering
- [ ] Test image placement with various scenarios
- [ ] Verify page breaks and spacing
- [ ] Test with missing images (graceful fallback)

---

## Technical Notes

### Page Break Handling
- Images may trigger page breaks
- Use `newPage()` function when needed
- Maintain consistent spacing

### Image Fallback
- If image fails to load, show placeholder box
- Display error message
- Continue report generation

### Conditional Rendering
- Check visibility flags before rendering
- Skip image if parent section is hidden
- Maintain report flow integrity

---

## Expected Outcomes

✅ Reports have cohesive visual narrative
✅ Images support evidence-first approach
✅ Market context established early with visuals
✅ Professional appearance maintained
✅ Appeal strength maximized through strategic placement
