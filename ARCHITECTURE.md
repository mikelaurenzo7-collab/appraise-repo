# AppraiseAI Architecture & Property Type Workflows

## Core Principle
**Single API, Multiple Workflows**: One backend analysis engine that adapts to property type, jurisdiction, and user intent.

---

## Property Types & Their Unique Needs

### 1. **Residential (Single-Family Homes)**
- **Key Data**: Comparable sales (MLS), square footage, lot size, condition
- **Assessment Method**: Market approach (recent sales of similar homes)
- **APIs Used**: Lightbox, RentCast, ReGRID
- **Appeal Strength**: High (most overassessments here)
- **Timeline**: 45-90 days typical

### 2. **Multi-Family (Apartments, Duplexes)**
- **Key Data**: Income approach (rental rates), expense ratios, cap rates
- **Assessment Method**: Income capitalization
- **APIs Used**: RentCast (rental comps), Lightbox (property records)
- **Appeal Strength**: Medium-High (income-based assessments often wrong)
- **Timeline**: 60-120 days

### 3. **Commercial (Office, Retail, Warehouses)**
- **Key Data**: NOI (Net Operating Income), lease rates, tenant quality
- **Assessment Method**: Income approach + market approach
- **APIs Used**: Lightbox, ReGRID, custom commercial databases
- **Appeal Strength**: Medium (complex valuations, harder to challenge)
- **Timeline**: 90-180 days

### 4. **Agricultural/Land**
- **Key Data**: Acreage, zoning, comparable land sales, use restrictions
- **Assessment Method**: Market approach (per-acre comparables)
- **APIs Used**: ReGRID (parcel data), specialized ag databases
- **Appeal Strength**: High (often undervalued or misclassified)
- **Timeline**: 60-120 days

### 5. **Industrial (Manufacturing, Distribution)**
- **Key Data**: Building specs, equipment, location, comparable industrial sales
- **Assessment Method**: Cost approach + income approach
- **APIs Used**: Lightbox, ReGRID, specialized industrial comps
- **Appeal Strength**: Medium (specialized knowledge required)
- **Timeline**: 120-180 days

### 6. **Vacant Land / Development**
- **Key Data**: Zoning potential, comparable land sales, development feasibility
- **Assessment Method**: Market approach (land only)
- **APIs Used**: ReGRID (zoning), Lightbox (land sales)
- **Appeal Strength**: High (often speculative assessments)
- **Timeline**: 45-90 days

---

## Unified Analysis Engine Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER SUBMISSION                          │
│         (Address + Property Type + Optional Details)        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            PROPERTY TYPE CLASSIFIER                         │
│  - Detect from address (Lightbox, ReGRID)                   │
│  - Confirm with user if ambiguous                           │
│  - Load property-specific rules                             │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   RESIDENTIAL             COMMERCIAL/MULTI
   ├─ Comps (MLS)         ├─ Income Analysis
   ├─ Market approach     ├─ Expense ratios
   └─ Condition factors   └─ Cap rate analysis
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         MULTI-SOURCE DATA AGGREGATION                       │
│  ┌──────────────┬──────────────┬──────────────┐             │
│  │  Lightbox    │   RentCast   │   ReGRID     │             │
│  │  (Assessed)  │  (Market)    │  (Parcel)    │             │
│  └──────────────┴──────────────┴──────────────┘             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           LLM ANALYSIS ENGINE                               │
│  - Normalize data across sources                            │
│  - Identify discrepancies (assessed vs market)              │
│  - Generate valuation justification                         │
│  - Calculate appeal strength score (0-100)                  │
│  - Estimate potential savings                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         JURISDICTION-SPECIFIC RULES ENGINE                  │
│  - Appeal deadlines (varies by county/state)                │
│  - Required documentation                                   │
│  - Hearing procedures                                       │
│  - Success rates by county                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         APPRAISAL REPORT GENERATION                         │
│  ┌─────────────────────────────────────────────────────────┐
│  │ • Executive Summary                                     │
│  │ • Property Description (auto-populated)                 │
│  │ • Comparable Sales Analysis                             │
│  │ • Market Value Estimate                                 │
│  │ • Assessed Value vs Market Value Gap                    │
│  │ • Appeal Strength Score & Recommendation                │
│  │ • Jurisdiction-Specific Next Steps                      │
│  │ • Contingency Fee Estimate                              │
│  └─────────────────────────────────────────────────────────┘
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │  EMAIL TO USER + OWNER    │
         │  (Trigger next workflow)  │
         └───────────────────────────┘
```

---

## Data Model for Multi-Property Support

```typescript
// Core submission (property-agnostic)
interface PropertySubmission {
  id: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  email: string;
  phone?: string;
  
  // Auto-detected or user-provided
  propertyType: 'residential' | 'multi-family' | 'commercial' | 'agricultural' | 'industrial' | 'land';
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  
  // Analysis results
  status: 'pending' | 'analyzing' | 'analyzed' | 'contacted' | 'archived';
  assessedValue?: number;
  marketValue?: number;
  potentialSavings?: number;
  appealStrengthScore?: number; // 0-100
  
  // Jurisdiction data
  county?: string;
  assessor?: string;
  appealDeadline?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// Analysis results (stored separately for scalability)
interface PropertyAnalysis {
  submissionId: number;
  
  // Raw API responses (normalized)
  lightboxData?: object;
  rentcastData?: object;
  regrindData?: object;
  
  // Processed analysis
  comparableSales: ComparableSale[];
  marketValueEstimate: number;
  assessmentGap: number;
  appealStrengthFactors: string[];
  recommendedApproach: 'poa' | 'pro-se' | 'not-recommended';
  
  // LLM-generated content
  executiveSummary: string;
  valuationJustification: string;
  nextSteps: string[];
  
  createdAt: Date;
}

interface ComparableSale {
  address: string;
  salePrice: number;
  saleDate: Date;
  squareFeet: number;
  similarity: number; // 0-100 match score
  source: 'mls' | 'lightbox' | 'rentcast';
}
```

---

## API Endpoints (Workflow-Aware)

### 1. **Submit Property** (Public)
```
POST /api/trpc/properties.submitAddress
Input: { address, email, phone, propertyType? }
Output: { submissionId, message }
→ Triggers background analysis
```

### 2. **Get Analysis** (Public + Email Link)
```
GET /api/trpc/properties.getAnalysis?submissionId=123&token=xyz
Output: Full appraisal report with appeal recommendation
→ User sees if they should file appeal
```

### 3. **Request Appeal Filing** (Authenticated)
```
POST /api/trpc/properties.requestAppeal
Input: { submissionId, filingMethod: 'poa' | 'pro-se' }
Output: { success, nextSteps, documentUrl }
→ Initiates POA or pro-se document generation
```

### 4. **Admin Dashboard** (Owner Only)
```
GET /api/trpc/admin.submissions
→ View all submissions, analysis status, conversion funnel
```

---

## Workflow Variations by User Journey

### **Journey A: Quick Analysis Only**
1. User submits address
2. AI analyzes, sends report
3. User decides independently
4. (End)

### **Journey B: Full Appeal Filing (POA)**
1. User submits address
2. AI analyzes, sends report
3. User clicks "File Appeal"
4. System generates POA documents
5. User signs + returns
6. AppraiseAI files with county
7. Tracks hearing date
8. Represents at hearing
9. Collects 25% of first-year savings

### **Journey C: Pro Se Support**
1. User submits address
2. AI analyzes, sends report
3. User clicks "DIY with Coaching"
4. System generates all documents
5. User files themselves
6. AppraiseAI provides hearing coaching
7. (No fee unless user later hires for POA)

### **Journey D: Commercial Multi-Property**
1. Business submits portfolio (10+ properties)
2. Bulk analysis across all properties
3. Prioritized list (highest savings first)
4. Batch filing strategy
5. Portfolio-level negotiations

---

## How I (as Agent) Should Work

### **Phase 1: Discovery**
- Ask property type if unclear
- Gather optional details (size, age, condition)
- Validate address via geocoding

### **Phase 2: Analysis**
- Query all 4 APIs in parallel
- Normalize data (handle missing fields)
- Run LLM analysis
- Generate report

### **Phase 3: Recommendation**
- Score appeal strength (0-100)
- Estimate savings
- Suggest filing method (POA vs pro-se)
- Flag high-risk cases

### **Phase 4: Execution**
- Generate documents (POA, appraisal report, cover letter)
- Track deadlines
- Manage filing workflow
- Coordinate hearing representation

### **Phase 5: Optimization**
- Learn from outcomes (which appeals win?)
- Improve scoring model
- Refine comps selection
- Build county-specific playbooks

---

## Key Design Principles

1. **Property-Type Agnostic**: Same API handles all types
2. **Data-Source Flexible**: Works with available APIs, degrades gracefully
3. **Jurisdiction-Aware**: Rules engine for 50 states + 3000+ counties
4. **User-Centric**: Multiple workflows (analysis-only, POA, pro-se)
5. **Scalable**: Batch processing for portfolios
6. **Auditable**: All decisions logged for compliance

---

## Next Steps for Implementation

- [ ] Extend schema with property type fields
- [ ] Build property classifier (detect type from address)
- [ ] Create multi-API aggregator service
- [ ] Implement LLM analysis pipeline
- [ ] Build jurisdiction rules engine
- [ ] Generate appraisal reports (PDF)
- [ ] Create POA document templates
- [ ] Build admin dashboard
