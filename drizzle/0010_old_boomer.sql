CREATE TABLE `referral_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`tier` enum('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze',
	`lifetimeReferrals` int NOT NULL DEFAULT 0,
	`lifetimeEarningsCents` int NOT NULL DEFAULT 0,
	`pendingBalanceCents` int NOT NULL DEFAULT 0,
	`paidOutCents` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_codes_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `referral_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `referral_payouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amountCents` int NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`method` enum('stripe_transfer','manual') NOT NULL DEFAULT 'stripe_transfer',
	`stripeTransferId` varchar(255),
	`notes` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_payouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerUserId` int NOT NULL,
	`referredUserId` int,
	`referredEmail` varchar(320),
	`submissionId` int,
	`referralCode` varchar(20) NOT NULL,
	`status` enum('clicked','signed_up','submitted','paid','credited','reversed') NOT NULL DEFAULT 'clicked',
	`commissionCents` int NOT NULL DEFAULT 0,
	`commissionTier` enum('bronze','silver','gold','platinum'),
	`stripePaymentIntentId` varchar(255),
	`clickedAt` timestamp,
	`signedUpAt` timestamp,
	`paidAt` timestamp,
	`creditedAt` timestamp,
	`reversedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_tracking_id` PRIMARY KEY(`id`)
);
