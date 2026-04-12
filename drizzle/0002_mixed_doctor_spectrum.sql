CREATE TABLE `property_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`lightboxData` text,
	`rentcastData` text,
	`regrindData` text,
	`attomData` text,
	`comparableSales` text,
	`marketValueEstimate` int,
	`assessmentGap` int,
	`appealStrengthFactors` text,
	`recommendedApproach` enum('poa','pro-se','not-recommended'),
	`executiveSummary` text,
	`valuationJustification` text,
	`nextSteps` text,
	`reportUrl` varchar(500),
	`reportGeneratedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `property_submissions` MODIFY COLUMN `status` enum('pending','analyzing','analyzed','contacted','appeal-filed','archived') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `propertyType` enum('residential','multi-family','commercial','agricultural','industrial','land','unknown') DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `squareFeet` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `lotSize` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `yearBuilt` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `bedrooms` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `bathrooms` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `assessedValue` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `marketValue` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `potentialSavings` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `appealStrengthScore` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `county` varchar(100);--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `assessor` varchar(255);--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `appealDeadline` timestamp;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `filingMethod` enum('poa','pro-se','none');