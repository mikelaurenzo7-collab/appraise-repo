CREATE TABLE `jurisdiction_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`state` varchar(2) NOT NULL,
	`county` varchar(100) NOT NULL,
	`assessmentRate` decimal(5,2) NOT NULL,
	`appealDeadlineDays` int NOT NULL,
	`appealDeadlineType` enum('from_notice','calendar_year','fiscal_year','rolling') NOT NULL,
	`minAssessmentDifference` int,
	`minAssessmentPercentage` decimal(5,2),
	`successRate` int,
	`averageResolutionDays` int,
	`filingMethods` varchar(255),
	`documentationRequired` text,
	`hearingRequired` boolean DEFAULT false,
	`contingencyFeeAllowed` boolean DEFAULT false,
	`maxContingencyFee` decimal(5,2),
	`notes` text,
	`source` varchar(255),
	`sourceUrl` varchar(500),
	`lastVerifiedAt` timestamp NOT NULL,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jurisdiction_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_jurisdiction_state_county` ON `jurisdiction_rules` (`state`,`county`);--> statement-breakpoint
CREATE INDEX `idx_jurisdiction_state` ON `jurisdiction_rules` (`state`);--> statement-breakpoint
CREATE INDEX `idx_jurisdiction_last_verified` ON `jurisdiction_rules` (`lastVerifiedAt`);