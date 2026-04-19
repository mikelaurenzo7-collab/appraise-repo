CREATE TABLE `report_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('queued','generating','completed','failed','expired') NOT NULL DEFAULT 'queued',
	`reportUrl` varchar(500),
	`reportKey` varchar(255),
	`sizeBytes` int,
	`errorMessage` text,
	`queuedAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_jobs_id` PRIMARY KEY(`id`)
);
