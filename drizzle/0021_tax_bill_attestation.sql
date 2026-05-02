-- Migration: Add tax bill and ownership attestation columns to property_submissions
-- Run this against your Supabase/PostgreSQL database

ALTER TABLE "property_submissions"
  ADD COLUMN IF NOT EXISTS "tax_bill_url" varchar(500),
  ADD COLUMN IF NOT EXISTS "apn" varchar(100),
  ADD COLUMN IF NOT EXISTS "annual_tax_amount" integer,
  ADD COLUMN IF NOT EXISTS "effective_tax_rate" decimal(6,5),
  ADD COLUMN IF NOT EXISTS "prior_year_assessed_value" integer,
  ADD COLUMN IF NOT EXISTS "tax_bill_data" text,
  ADD COLUMN IF NOT EXISTS "owner_attestation" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "owner_attestation_at" timestamptz;
