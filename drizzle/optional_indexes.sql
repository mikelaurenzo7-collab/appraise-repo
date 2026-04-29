-- =============================================================================
-- Optional performance indexes for AppraiseAI.
--
-- Apply this file with:
--   mysql --defaults-extra-file=<auth.cnf> < drizzle/optional_indexes.sql
--
-- These mirror the index() definitions in drizzle/schema.ts. They are safe
-- to apply on a live MySQL 8 database — `CREATE INDEX` is online for these
-- columns and has no exclusive lock past metadata-update time.
--
-- Every statement is idempotent. The procedure pattern checks
-- information_schema.statistics first and skips creation if the index
-- already exists, so re-running this file is safe.
-- =============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS create_index_if_missing $$
CREATE PROCEDURE create_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_cols  VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name   = p_table
       AND index_name   = p_index
  ) THEN
    SET @s = CONCAT('CREATE INDEX ', p_index, ' ON ', p_table, ' (', p_cols, ')');
    PREPARE stmt FROM @s;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DELIMITER ;

CALL create_index_if_missing('property_submissions', 'idx_submissions_status_created', '`status`, createdAt');
CALL create_index_if_missing('property_submissions', 'idx_submissions_email',          'email');
CALL create_index_if_missing('property_submissions', 'idx_submissions_county',         'county');

CALL create_index_if_missing('property_analysis',    'idx_analysis_submission',        'submissionId');

CALL create_index_if_missing('appeal_outcomes',      'idx_outcomes_submission',        'submissionId');
CALL create_index_if_missing('appeal_outcomes',      'idx_outcomes_outcome_resolved',  'outcome, resolvedAt');

CALL create_index_if_missing('activity_logs',        'idx_logs_submission_created',    'submissionId, createdAt');
CALL create_index_if_missing('activity_logs',        'idx_logs_type_status',           '`type`, `status`');

CALL create_index_if_missing('api_cache',            'idx_cache_expires',              'expiresAt');

CALL create_index_if_missing('property_photos',      'idx_photos_submission',          'submissionId, displayOrder');

CALL create_index_if_missing('report_jobs',          'idx_report_jobs_status_queued',  '`status`, queuedAt');
CALL create_index_if_missing('report_jobs',          'idx_report_jobs_submission',     'submissionId');
CALL create_index_if_missing('report_jobs',          'idx_report_jobs_user',           'userId');
CALL create_index_if_missing('report_jobs',          'idx_report_jobs_expires',        'expiresAt');

CALL create_index_if_missing('counties',             'idx_counties_state_county',      'state, countyName');

CALL create_index_if_missing('filing_recipes',       'idx_recipes_county_active',      'countyId, active');

CALL create_index_if_missing('scrivener_authorizations', 'idx_scrivener_submission',   'submissionId');
CALL create_index_if_missing('scrivener_authorizations', 'idx_scrivener_user',         'userId');

CALL create_index_if_missing('filing_jobs',          'idx_filing_jobs_status_queued',  '`status`, queuedAt');
CALL create_index_if_missing('filing_jobs',          'idx_filing_jobs_submission',     'submissionId');
CALL create_index_if_missing('filing_jobs',          'idx_filing_jobs_user',           'userId');
CALL create_index_if_missing('filing_jobs',          'idx_filing_jobs_delivery_status','deliveryStatus');
CALL create_index_if_missing('filing_jobs',          'idx_filing_jobs_tracking',       'mailTrackingNumber');

CALL create_index_if_missing('refund_requests',      'idx_refunds_status',             '`status`');
CALL create_index_if_missing('refund_requests',      'idx_refunds_submission',         'submissionId');
CALL create_index_if_missing('refund_requests',      'idx_refunds_user',               'userId');

CALL create_index_if_missing('county_waitlist',      'idx_waitlist_email',             'email');
CALL create_index_if_missing('county_waitlist',      'idx_waitlist_state_county',      'state, countyName');

CALL create_index_if_missing('poa_filings',          'idx_poa_submission',             'submissionId');
CALL create_index_if_missing('poa_filings',          'idx_poa_county_status',          'countyId, `status`');

CALL create_index_if_missing('pro_se_filings',       'idx_prose_submission',           'submissionId');
CALL create_index_if_missing('pro_se_filings',       'idx_prose_county_status',        'countyId, `status`');

CALL create_index_if_missing('filing_tiers',         'idx_tiers_submission',           'submissionId');
CALL create_index_if_missing('filing_tiers',         'idx_tiers_payment_status',       'paymentStatus');

CALL create_index_if_missing('paralegals_queue',     'idx_paralegals_status_priority', '`status`, priority');
CALL create_index_if_missing('paralegals_queue',     'idx_paralegals_assigned',        'assignedTo');
CALL create_index_if_missing('paralegals_queue',     'idx_paralegals_poa',             'poaFilingId');

DROP PROCEDURE create_index_if_missing;
