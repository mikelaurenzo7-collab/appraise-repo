CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int,
	`type` varchar(64) NOT NULL,
	`actor` enum('system','user','admin') NOT NULL DEFAULT 'system',
	`actorId` int,
	`description` text NOT NULL,
	`metadata` text,
	`status` enum('success','warning','error') NOT NULL DEFAULT 'success',
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cacheKey` varchar(255) NOT NULL,
	`source` varchar(64) NOT NULL,
	`responseData` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`hitCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_cache_cacheKey_unique` UNIQUE(`cacheKey`)
);
--> statement-breakpoint
CREATE TABLE `appeal_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`outcome` enum('won','lost','settled','withdrawn','pending-hearing') NOT NULL,
	`originalAssessedValue` int,
	`finalAssessedValue` int,
	`reductionAmount` int,
	`annualTaxSavings` int,
	`contingencyFeeEarned` decimal(10,2),
	`filedAt` timestamp,
	`hearingDate` timestamp,
	`resolvedAt` timestamp,
	`resolutionDays` int,
	`county` varchar(100),
	`state` varchar(2),
	`boardName` varchar(255),
	`filingMethod` enum('poa','pro-se'),
	`groundsForAppeal` text,
	`evidenceStrength` int,
	`adminNotes` text,
	`hearingNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appeal_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `property_submissions` MODIFY COLUMN `status` enum('pending','analyzing','analyzed','contacted','appeal-filed','hearing-scheduled','won','lost','withdrawn','archived') NOT NULL DEFAULT 'pending';