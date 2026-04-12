CREATE TABLE `property_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`photoUrl` varchar(500) NOT NULL,
	`photoKey` varchar(255) NOT NULL,
	`caption` text,
	`category` enum('exterior','interior','damage','condition','comparable','neighborhood','other') DEFAULT 'other',
	`displayOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `property_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`includeCostApproach` enum('yes','no','auto') DEFAULT 'auto',
	`includeSalesComparison` enum('yes','no','auto') DEFAULT 'auto',
	`includeIncomeApproach` enum('yes','no','auto') DEFAULT 'auto',
	`recommendedStrategy` enum('poa','pro-se','both','auto') DEFAULT 'auto',
	`emphasizePhotos` enum('yes','no') DEFAULT 'yes',
	`includeMarketAnalysis` enum('yes','no') DEFAULT 'yes',
	`includeComparableProperties` enum('yes','no') DEFAULT 'yes',
	`additionalNotes` text,
	`targetAudience` enum('assessor','board','attorney','owner') DEFAULT 'board',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `report_preferences_submissionId_unique` UNIQUE(`submissionId`)
);
