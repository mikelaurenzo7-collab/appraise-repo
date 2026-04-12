CREATE TABLE `property_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`address` varchar(255) NOT NULL,
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`email` varchar(320) NOT NULL,
	`phone` varchar(20),
	`status` enum('pending','analyzed','contacted','archived') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_submissions_id` PRIMARY KEY(`id`)
);
