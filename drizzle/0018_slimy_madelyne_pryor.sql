DROP INDEX `idx_pa_submission_id` ON `property_analysis`;--> statement-breakpoint
DROP INDEX `idx_ps_email` ON `property_submissions`;--> statement-breakpoint
DROP INDEX `idx_ps_status` ON `property_submissions`;--> statement-breakpoint
DROP INDEX `idx_ps_created_at` ON `property_submissions`;--> statement-breakpoint
CREATE INDEX `idx_logs_submission_created` ON `activity_logs` (`submissionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_logs_type_status` ON `activity_logs` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_cache_expires` ON `api_cache` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_outcomes_submission` ON `appeal_outcomes` (`submissionId`);--> statement-breakpoint
CREATE INDEX `idx_outcomes_outcome_resolved` ON `appeal_outcomes` (`outcome`,`resolvedAt`);--> statement-breakpoint
CREATE INDEX `idx_counties_state_county` ON `counties` (`state`,`countyName`);--> statement-breakpoint
CREATE INDEX `idx_waitlist_email` ON `county_waitlist` (`email`);--> statement-breakpoint
CREATE INDEX `idx_waitlist_state_county` ON `county_waitlist` (`state`,`countyName`);--> statement-breakpoint
CREATE INDEX `idx_filing_jobs_status_queued` ON `filing_jobs` (`status`,`queuedAt`);--> statement-breakpoint
CREATE INDEX `idx_filing_jobs_submission` ON `filing_jobs` (`submissionId`);--> statement-breakpoint
CREATE INDEX `idx_filing_jobs_user` ON `filing_jobs` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_filing_jobs_delivery_status` ON `filing_jobs` (`deliveryStatus`);--> statement-breakpoint
CREATE INDEX `idx_filing_jobs_tracking` ON `filing_jobs` (`mailTrackingNumber`);--> statement-breakpoint
CREATE INDEX `idx_recipes_county_active` ON `filing_recipes` (`countyId`,`active`);--> statement-breakpoint
CREATE INDEX `idx_tiers_submission` ON `filing_tiers` (`submissionId`);--> statement-breakpoint
CREATE INDEX `idx_tiers_payment_status` ON `filing_tiers` (`paymentStatus`);--> statement-breakpoint
CREATE INDEX `idx_paralegals_status_priority` ON `paralegals_queue` (`status`,`priority`);--> statement-breakpoint
CREATE INDEX `idx_paralegals_assigned` ON `paralegals_queue` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `idx_paralegals_poa` ON `paralegals_queue` (`poaFilingId`);--> statement-breakpoint
CREATE INDEX `idx_poa_submission` ON `poa_filings` (`submissionId`);--> statement-breakpoint
CREATE INDEX `idx_poa_county_status` ON `poa_filings` (`countyId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_prose_submission` ON `pro_se_filings` (`submissionId`);--> statement-breakpoint
CREATE INDEX `idx_prose_county_status` ON `pro_se_filings` (`countyId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_analysis_submission` ON `property_analysis` (`submissionId`);--> statement-breakpoint
CREATE INDEX `idx_photos_submission` ON `property_photos` (`submissionId`,`displayOrder`);--> statement-breakpoint
CREATE INDEX `idx_submissions_status_created` ON `property_submissions` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_submissions_email` ON `property_submissions` (`email`);--> statement-breakpoint
CREATE INDEX `idx_submissions_county` ON `property_submissions` (`county`);--> statement-breakpoint
CREATE INDEX `idx_refunds_status` ON `refund_requests` (`status`);--> statement-breakpoint
CREATE INDEX `idx_refunds_submission` ON `refund_requests` (`submissionId`);--> statement-breakpoint
CREATE INDEX `idx_refunds_user` ON `refund_requests` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_report_jobs_status_queued` ON `report_jobs` (`status`,`queuedAt`);--> statement-breakpoint
CREATE INDEX `idx_report_jobs_submission` ON `report_jobs` (`submissionId`);--> statement-breakpoint
CREATE INDEX `idx_report_jobs_user` ON `report_jobs` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_report_jobs_expires` ON `report_jobs` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_scrivener_submission` ON `scrivener_authorizations` (`submissionId`);--> statement-breakpoint
CREATE INDEX `idx_scrivener_user` ON `scrivener_authorizations` (`userId`);