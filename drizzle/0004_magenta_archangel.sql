ALTER TABLE `appeal_outcomes` ADD `stripePaymentIntentId` varchar(255);--> statement-breakpoint
ALTER TABLE `appeal_outcomes` ADD `contingencyFeePaid` decimal(10,2);--> statement-breakpoint
ALTER TABLE `appeal_outcomes` ADD `paidAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);