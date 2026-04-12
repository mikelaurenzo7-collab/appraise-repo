# AppraiseAI Implementation TODO

## Phase 1: Core Analysis Engine
- [x] Extend database schema with property type fields
- [x] Build property classifier service (detect type from address)
- [x] Create multi-API aggregator (Lightbox, RentCast, ReGRID, AttomData)
- [x] Implement LLM analysis pipeline
- [x] Generate appraisal reports (JSON + PDF)
- [x] Write tests for analysis engine

## Phase 2: Jurisdiction Rules & Workflows
- [x] Build jurisdiction rules database (deadlines, procedures, success rates)
- [x] Create appeal strength scoring algorithm
- [x] Implement appraisal methodology service (USPAP-compliant)
- [x] Create appeal strategy service with county playbooks
- [x] Implement POA document generation
- [x] Implement pro-se document generation
- [x] Add filing method selection to form (via filingMethod enum in schema)

## Phase 3: User Workflows
- [x] Update GetStarted form to redirect to analysis results
- [x] Create analysis results page with live polling
- [x] Build appeal filing flow (POA vs pro-se) — document generators ready
- [x] Add email report delivery (via notifyOwner + report generation)
- [x] Create user dashboard (track submissions)

## Phase 4: Admin & Monitoring
- [x] Build admin dashboard (submissions, conversions, outcomes)
- [x] Add activity logging service
- [x] Create analytics hooks
- [x] Build command center for all routers (admin + user + properties routers)
- [x] Integrate activity logs into admin dashboard (via activity logger service)
- [x] Add document generator service (POA, pro se, cover letters)

## Phase 5: Optimization & Scaling
- [ ] Batch processing for portfolio submissions
- [ ] County-specific playbooks
- [ ] Outcome tracking & model improvement
- [ ] Performance optimization

## Completed
- [x] Initial website scaffold with all pages
- [x] Database setup with users table
- [x] Form submission API (properties.submitAddress)
- [x] Owner notification on submission
- [x] API keys configured (Lightbox, RentCast, ReGRID, AttomData)

## Phase 6 Completed
- [x] POA document generation
- [x] Pro Se filing packet generation  
- [x] Cover letter generation
- [x] User dashboard with submission tracking

## Recently Fixed
- [x] Fix ATTOM_API_KEY env var name (was ATTTOM)
- [x] Fix Attom API auth to use header-based apikey
- [x] Fix Attom API endpoint to correct v1.0.0 gateway URL
- [x] Fix Attom response field mapping to v1.0.0 structure
- [x] Fix industrial classifier ordering
- [x] Pass property type to LLM analyzer
- [x] Build AnalysisResults page with live polling
- [x] GetStarted redirects to /analysis?id=X after submission
