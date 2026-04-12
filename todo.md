# AppraiseAI Implementation TODO

## Phase 1: Core Analysis Engine
- [x] Extend database schema with property type fields
- [x] Build property classifier service (detect type from address)
- [x] Create multi-API aggregator (Lightbox, RentCast, ReGRID, AttomData)
- [x] Implement LLM analysis pipeline
- [ ] Generate appraisal reports (JSON + PDF)
- [x] Write tests for analysis engine

## Phase 2: Jurisdiction Rules & Workflows
- [ ] Build jurisdiction rules database (deadlines, procedures, success rates)
- [ ] Create appeal strength scoring algorithm
- [ ] Implement POA document generation
- [ ] Implement pro-se document generation
- [ ] Add filing method selection to form

## Phase 3: User Workflows
- [x] Update GetStarted form to redirect to analysis results
- [x] Create analysis results page with live polling
- [ ] Build appeal filing flow (POA vs pro-se)
- [ ] Add email report delivery
- [ ] Create user dashboard (track submissions)

## Phase 4: Admin & Monitoring
- [ ] Build admin dashboard (submissions, conversions, outcomes)
- [ ] Add activity logging
- [ ] Create analytics hooks
- [ ] Build command center for all routers

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
