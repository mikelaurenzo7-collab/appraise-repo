CREATE INDEX `idx_pa_submission_id` ON `property_analysis` (`submissionId`);--> statement-breakpoint
CREATE INDEX `idx_ps_email` ON `property_submissions` (`email`);--> statement-breakpoint
CREATE INDEX `idx_ps_status` ON `property_submissions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ps_created_at` ON `property_submissions` (`createdAt`);