CREATE TABLE `county_waitlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`state` varchar(2),
	`countyName` varchar(100),
	`submissionId` int,
	`notes` text,
	`notifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `county_waitlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `filing_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`userId` int NOT NULL,
	`recipeId` int,
	`authorizationId` int NOT NULL,
	`deliveryChannel` enum('portal','mail_certified','mail_first_class','email'),
	`status` enum('pending','processing','awaiting_captcha','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`inputs` text,
	`portalConfirmationNumber` varchar(255),
	`finalScreenshotKey` varchar(500),
	`executionLogKey` varchar(500),
	`mailTrackingNumber` varchar(64),
	`lobLetterId` varchar(64),
	`lobExpectedDeliveryDate` timestamp,
	`emailMessageId` varchar(255),
	`emailRecipient` varchar(320),
	`deliveryStatus` enum('pending','in_transit','delivered','returned','failed') DEFAULT 'pending',
	`deliveryStatusUpdatedAt` timestamp,
	`errorMessage` text,
	`queuedAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 2,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filing_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `filing_recipes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countyId` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`portalUrl` varchar(500) NOT NULL,
	`steps` text NOT NULL,
	`validFrom` timestamp,
	`validUntil` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	`verificationStatus` enum('draft','staging','verified','broken') NOT NULL DEFAULT 'draft',
	`lastVerifiedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filing_recipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refund_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`userId` int NOT NULL,
	`stripeChargeId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`amountCents` int NOT NULL,
	`status` enum('pending','approved','denied','refunded','failed') NOT NULL DEFAULT 'pending',
	`reason` text,
	`adminNotes` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`decidedAt` timestamp,
	`decidedBy` int,
	`refundedAt` timestamp,
	`stripeRefundId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `refund_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scrivener_authorizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`userId` int,
	`typedName` varchar(255) NOT NULL,
	`ipAddress` varchar(64),
	`userAgent` varchar(512),
	`authorizationTextHash` varchar(64) NOT NULL,
	`authorizationText` text NOT NULL,
	`scrolledToEnd` boolean NOT NULL DEFAULT false,
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scrivener_authorizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stripe_events_processed` (
	`eventId` varchar(255) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stripe_events_processed_eventId` PRIMARY KEY(`eventId`)
);
--> statement-breakpoint
ALTER TABLE `counties` ADD `poaEligible` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `counties` ADD `onlinePortalOnly` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `counties` ADD `pinOnlyLogin` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `counties` ADD `filingWindowStart` varchar(10);--> statement-breakpoint
ALTER TABLE `counties` ADD `filingWindowEnd` varchar(10);--> statement-breakpoint
ALTER TABLE `counties` ADD `preferredChannel` enum('portal','mail_certified','mail_first_class','email','unsupported') DEFAULT 'mail_certified' NOT NULL;--> statement-breakpoint
ALTER TABLE `counties` ADD `fallbackChannel` enum('mail_certified','mail_first_class','email','unsupported') DEFAULT 'mail_certified';--> statement-breakpoint
ALTER TABLE `counties` ADD `mailingAddressName` varchar(255);--> statement-breakpoint
ALTER TABLE `counties` ADD `mailingAddressLine1` varchar(200);--> statement-breakpoint
ALTER TABLE `counties` ADD `mailingAddressLine2` varchar(200);--> statement-breakpoint
ALTER TABLE `counties` ADD `mailingAddressCity` varchar(100);--> statement-breakpoint
ALTER TABLE `counties` ADD `mailingAddressState` varchar(2);--> statement-breakpoint
ALTER TABLE `counties` ADD `mailingAddressZip` varchar(10);--> statement-breakpoint
ALTER TABLE `counties` ADD `intakeEmail` varchar(320);