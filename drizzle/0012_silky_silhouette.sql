ALTER TABLE `property_analysis` ADD `scenarioContext` text;--> statement-breakpoint
ALTER TABLE `property_analysis` ADD `valuationApproachWeights` text;--> statement-breakpoint
ALTER TABLE `property_analysis` ADD `compQualityBreakdown` text;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `userScenario` enum('primary_residence','rental_property','vacation_home','inherited_property','recently_purchased','planning_to_sell','distressed_condition','new_construction','recently_renovated','none') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `conditionNotes` text;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `estimatedMarketValueLow` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `estimatedMarketValueHigh` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `taxRateOverride` decimal(5,4);--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `confidenceScore` int;--> statement-breakpoint
ALTER TABLE `property_submissions` ADD `compQualityScore` int;