-- =============================================================================
-- APPRAISE-AI — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE property_type AS ENUM ('residential', 'multi-family', 'commercial', 'agricultural', 'industrial', 'land', 'unknown');
CREATE TYPE user_scenario AS ENUM ('primary_residence', 'rental_property', 'vacation_home', 'inherited_property', 'recently_purchased', 'planning_to_sell', 'distressed_condition', 'new_construction', 'recently_renovated', 'none');
CREATE TYPE submission_status AS ENUM ('pending', 'analyzing', 'analyzed', 'contacted', 'appeal-filed', 'hearing-scheduled', 'won', 'lost', 'withdrawn', 'archived');
CREATE TYPE filing_method AS ENUM ('poa', 'pro-se', 'none');
CREATE TYPE recommended_approach AS ENUM ('poa', 'pro-se', 'not-recommended');
CREATE TYPE appeal_outcome AS ENUM ('won', 'lost', 'settled', 'withdrawn', 'pending-hearing');
CREATE TYPE activity_actor AS ENUM ('system', 'user', 'admin');
CREATE TYPE activity_status AS ENUM ('success', 'warning', 'error');
CREATE TYPE photo_category AS ENUM ('exterior', 'interior', 'damage', 'condition', 'comparable', 'neighborhood', 'other');
CREATE TYPE include_option AS ENUM ('yes', 'no', 'auto');
CREATE TYPE strategy_option AS ENUM ('poa', 'pro-se', 'both', 'auto');
CREATE TYPE target_audience AS ENUM ('assessor', 'board', 'attorney', 'owner');
CREATE TYPE report_job_status AS ENUM ('queued', 'generating', 'completed', 'failed', 'expired');
CREATE TYPE preferred_channel AS ENUM ('portal', 'mail_certified', 'mail_first_class', 'email', 'unsupported');
CREATE TYPE verification_status AS ENUM ('draft', 'staging', 'verified', 'broken');
CREATE TYPE delivery_channel AS ENUM ('portal', 'mail_certified', 'mail_first_class', 'email');
CREATE TYPE filing_job_status AS ENUM ('pending', 'processing', 'awaiting_captcha', 'completed', 'failed', 'cancelled');
CREATE TYPE delivery_status AS ENUM ('pending', 'in_transit', 'delivered', 'returned', 'failed');
CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'denied', 'refunded', 'failed');
CREATE TYPE poa_filing_status AS ENUM ('pending', 'filed', 'acknowledged', 'scheduled', 'hearing-held', 'decided', 'failed');
CREATE TYPE hearing_format AS ENUM ('in-person', 'virtual', 'hybrid', 'mail');
CREATE TYPE poa_filing_outcome AS ENUM ('won', 'lost', 'settled', 'withdrawn', 'pending');
CREATE TYPE pro_se_filing_status AS ENUM ('started', 'forms-generated', 'documents-sent', 'filed', 'hearing-scheduled', 'completed', 'abandoned');
CREATE TYPE filing_tier AS ENUM ('pro-se', 'poa');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('stripe', 'none');
CREATE TYPE paralegal_queue_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE paralegal_queue_status AS ENUM ('queued', 'in-progress', 'completed', 'blocked');

-- =============================================================================
-- TABLE: users
-- =============================================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  open_id VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  login_method VARCHAR(64),
  role user_role NOT NULL DEFAULT 'user',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: property_submissions
-- =============================================================================
CREATE TABLE property_submissions (
  id SERIAL PRIMARY KEY,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(20),
  property_type property_type DEFAULT 'unknown',
  user_scenario user_scenario DEFAULT 'none',
  condition_notes TEXT,
  square_feet INTEGER,
  lot_size INTEGER,
  year_built INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  assessed_value INTEGER,
  market_value INTEGER,
  estimated_market_value_low INTEGER,
  estimated_market_value_high INTEGER,
  potential_savings INTEGER,
  tax_rate_override DECIMAL(5, 4),
  appeal_strength_score INTEGER,
  confidence_score INTEGER,
  comp_quality_score INTEGER,
  county VARCHAR(100),
  assessor VARCHAR(255),
  appeal_deadline TIMESTAMPTZ,
  status submission_status NOT NULL DEFAULT 'pending',
  filing_method filing_method,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: property_analysis
-- =============================================================================
CREATE TABLE property_analysis (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  lightbox_data TEXT,
  rentcast_data TEXT,
  regrind_data TEXT,
  attom_data TEXT,
  comparable_sales TEXT,
  market_value_estimate INTEGER,
  assessment_gap INTEGER,
  appeal_strength_factors TEXT,
  recommended_approach recommended_approach,
  executive_summary TEXT,
  valuation_justification TEXT,
  next_steps TEXT,
  scenario_context TEXT,
  valuation_approach_weights TEXT,
  comp_quality_breakdown TEXT,
  report_url VARCHAR(500),
  report_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: appeal_outcomes
-- =============================================================================
CREATE TABLE appeal_outcomes (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  outcome appeal_outcome NOT NULL,
  original_assessed_value INTEGER,
  final_assessed_value INTEGER,
  reduction_amount INTEGER,
  annual_tax_savings INTEGER,
  contingency_fee_earned DECIMAL(10, 2),
  filed_at TIMESTAMPTZ,
  hearing_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_days INTEGER,
  county VARCHAR(100),
  state VARCHAR(2),
  board_name VARCHAR(255),
  filing_method filing_method,
  grounds_for_appeal TEXT,
  evidence_strength INTEGER,
  admin_notes TEXT,
  hearing_notes TEXT,
  stripe_payment_intent_id VARCHAR(255),
  contingency_fee_paid DECIMAL(10, 2),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: activity_logs
-- =============================================================================
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES property_submissions(id) ON DELETE SET NULL,
  type VARCHAR(64) NOT NULL,
  actor activity_actor NOT NULL DEFAULT 'system',
  actor_id INTEGER,
  description TEXT NOT NULL,
  metadata TEXT,
  status activity_status NOT NULL DEFAULT 'success',
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: api_cache
-- =============================================================================
CREATE TABLE api_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  source VARCHAR(64) NOT NULL,
  response_data TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_api_cache_expires_at ON api_cache(expires_at);
CREATE INDEX idx_api_cache_source ON api_cache(source);

-- =============================================================================
-- TABLE: property_photos
-- =============================================================================
CREATE TABLE property_photos (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  photo_url VARCHAR(500) NOT NULL,
  photo_key VARCHAR(255) NOT NULL,
  caption TEXT,
  category photo_category DEFAULT 'other',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_property_photos_submission_id ON property_photos(submission_id);

-- =============================================================================
-- TABLE: report_preferences
-- =============================================================================
CREATE TABLE report_preferences (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL UNIQUE REFERENCES property_submissions(id) ON DELETE CASCADE,
  include_cost_approach include_option DEFAULT 'auto',
  include_sales_comparison include_option DEFAULT 'auto',
  include_income_approach include_option DEFAULT 'auto',
  recommended_strategy strategy_option DEFAULT 'auto',
  emphasize_photos include_option DEFAULT 'yes',
  include_market_analysis include_option DEFAULT 'yes',
  include_comparable_properties include_option DEFAULT 'yes',
  additional_notes TEXT,
  target_audience target_audience DEFAULT 'board',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: report_jobs
-- =============================================================================
CREATE TABLE report_jobs (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status report_job_status NOT NULL DEFAULT 'queued',
  report_url VARCHAR(500),
  report_key VARCHAR(255),
  size_bytes INTEGER,
  error_message TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_report_jobs_submission_id ON report_jobs(submission_id);
CREATE INDEX idx_report_jobs_status ON report_jobs(status);
CREATE INDEX idx_report_jobs_expires_at ON report_jobs(expires_at);

-- =============================================================================
-- TABLE: counties
-- =============================================================================
CREATE TABLE counties (
  id SERIAL PRIMARY KEY,
  state VARCHAR(2) NOT NULL,
  county_name VARCHAR(100) NOT NULL,
  county_code VARCHAR(10),
  poa_deadline_days INTEGER,
  pro_se_deadline_days INTEGER,
  has_online_portal BOOLEAN DEFAULT false,
  portal_url VARCHAR(500),
  accepts_email BOOLEAN DEFAULT false,
  accepts_mail BOOLEAN DEFAULT false,
  accepts_in_person BOOLEAN DEFAULT false,
  poa_eligible BOOLEAN DEFAULT false,
  online_portal_only BOOLEAN DEFAULT false,
  pin_only_login BOOLEAN DEFAULT false,
  filing_window_start VARCHAR(10),
  filing_window_end VARCHAR(10),
  preferred_channel preferred_channel NOT NULL DEFAULT 'mail_certified',
  fallback_channel preferred_channel DEFAULT 'mail_certified',
  mailing_address_name VARCHAR(255),
  mailing_address_line1 VARCHAR(200),
  mailing_address_line2 VARCHAR(200),
  mailing_address_city VARCHAR(100),
  mailing_address_state VARCHAR(2),
  mailing_address_zip VARCHAR(10),
  intake_email VARCHAR(320),
  assessor_name VARCHAR(255),
  assessor_phone VARCHAR(20),
  assessor_email VARCHAR(320),
  arb_name VARCHAR(255),
  arb_phone VARCHAR(20),
  arb_email VARCHAR(320),
  filing_fee INTEGER,
  hearing_fee INTEGER,
  hearing_format hearing_format DEFAULT 'in-person',
  hearing_schedule_days INTEGER,
  requires_attorney BOOLEAN DEFAULT false,
  form_template_url VARCHAR(500),
  form_template_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_counties_state_county ON counties(state, county_name);

-- =============================================================================
-- TABLE: filing_recipes
-- =============================================================================
CREATE TABLE filing_recipes (
  id SERIAL PRIMARY KEY,
  county_id INTEGER NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  portal_url VARCHAR(500) NOT NULL,
  steps TEXT NOT NULL,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  verification_status verification_status NOT NULL DEFAULT 'draft',
  last_verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_filing_recipes_county_id_active ON filing_recipes(county_id, active);

-- =============================================================================
-- TABLE: scrivener_authorizations
-- =============================================================================
CREATE TABLE scrivener_authorizations (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  typed_name VARCHAR(255) NOT NULL,
  ip_address VARCHAR(64),
  user_agent VARCHAR(512),
  authorization_text_hash VARCHAR(64) NOT NULL,
  authorization_text TEXT NOT NULL,
  scrolled_to_end BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_scrivener_authorizations_submission_id ON scrivener_authorizations(submission_id);

-- =============================================================================
-- TABLE: filing_jobs
-- =============================================================================
CREATE TABLE filing_jobs (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER REFERENCES filing_recipes(id) ON DELETE SET NULL,
  authorization_id INTEGER NOT NULL REFERENCES scrivener_authorizations(id) ON DELETE CASCADE,
  delivery_channel delivery_channel,
  status filing_job_status NOT NULL DEFAULT 'pending',
  inputs TEXT,
  portal_confirmation_number VARCHAR(255),
  final_screenshot_key VARCHAR(500),
  execution_log_key VARCHAR(500),
  mail_tracking_number VARCHAR(64),
  lob_letter_id VARCHAR(64),
  lob_expected_delivery_date TIMESTAMPTZ,
  email_message_id VARCHAR(255),
  email_recipient VARCHAR(320),
  delivery_status delivery_status DEFAULT 'pending',
  delivery_status_updated_at TIMESTAMPTZ,
  error_message TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_filing_jobs_submission_id ON filing_jobs(submission_id);
CREATE INDEX idx_filing_jobs_status ON filing_jobs(status);

-- =============================================================================
-- TABLE: refund_requests
-- =============================================================================
CREATE TABLE refund_requests (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_charge_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  amount_cents INTEGER NOT NULL,
  status refund_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  admin_notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by INTEGER,
  refunded_at TIMESTAMPTZ,
  stripe_refund_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refund_requests_submission_id ON refund_requests(submission_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);

-- =============================================================================
-- TABLE: stripe_events_processed
-- =============================================================================
CREATE TABLE stripe_events_processed (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(128) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: county_waitlist
-- =============================================================================
CREATE TABLE county_waitlist (
  id SERIAL PRIMARY KEY,
  email VARCHAR(320) NOT NULL,
  state VARCHAR(2),
  county_name VARCHAR(100),
  submission_id INTEGER REFERENCES property_submissions(id) ON DELETE SET NULL,
  notes TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: poa_filings
-- =============================================================================
CREATE TABLE poa_filings (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  county_id INTEGER NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  status poa_filing_status NOT NULL DEFAULT 'pending',
  filing_date TIMESTAMPTZ,
  filed_by VARCHAR(255),
  hearing_date TIMESTAMPTZ,
  hearing_time VARCHAR(20),
  hearing_location VARCHAR(255),
  hearing_format hearing_format,
  outcome poa_filing_outcome DEFAULT 'pending',
  new_assessed_value INTEGER,
  assessment_reduction INTEGER,
  confirmation_number VARCHAR(100),
  portal_url VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_poa_filings_submission_id ON poa_filings(submission_id);
CREATE INDEX idx_poa_filings_status ON poa_filings(status);

-- =============================================================================
-- TABLE: pro_se_filings
-- =============================================================================
CREATE TABLE pro_se_filings (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  county_id INTEGER NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
  status pro_se_filing_status NOT NULL DEFAULT 'started',
  forms_pdf_url VARCHAR(500),
  checklist_pdf_url VARCHAR(500),
  instructions_pdf_url VARCHAR(500),
  forms_sent_date TIMESTAMPTZ,
  user_filed_date TIMESTAMPTZ,
  confirmation_received BOOLEAN DEFAULT false,
  coaching_emails_sent INTEGER DEFAULT 0,
  last_coaching_email TIMESTAMPTZ,
  hearing_date TIMESTAMPTZ,
  outcome poa_filing_outcome DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pro_se_filings_submission_id ON pro_se_filings(submission_id);

-- =============================================================================
-- TABLE: filing_tiers
-- =============================================================================
CREATE TABLE filing_tiers (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES property_submissions(id) ON DELETE CASCADE,
  tier filing_tier NOT NULL,
  pro_se_price INTEGER,
  contingency_percentage INTEGER,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_method payment_method,
  stripe_payment_intent_id VARCHAR(255),
  contingency_paid_date TIMESTAMPTZ,
  contingency_amount INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_filing_tiers_submission_id ON filing_tiers(submission_id);

-- =============================================================================
-- TABLE: paralegals_queue
-- =============================================================================
CREATE TABLE paralegals_queue (
  id SERIAL PRIMARY KEY,
  poa_filing_id INTEGER NOT NULL REFERENCES poa_filings(id) ON DELETE CASCADE,
  assigned_to VARCHAR(255),
  priority paralegal_queue_priority NOT NULL DEFAULT 'normal',
  status paralegal_queue_status NOT NULL DEFAULT 'queued',
  notes TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_paralegals_queue_poa_filing_id ON paralegals_queue(poa_filing_id);
CREATE INDEX idx_paralegals_queue_status ON paralegals_queue(status);

-- =============================================================================
-- Row Level Security (RLS) — enable for Supabase Auth compatibility
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeal_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrivener_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events_processed ENABLE ROW LEVEL SECURITY;
ALTER TABLE county_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE poa_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_se_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE paralegals_queue ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Enable pg_vector extension for semantic search (future use)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "vector";
