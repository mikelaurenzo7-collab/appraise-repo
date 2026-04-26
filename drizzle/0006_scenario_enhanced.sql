-- Migration 0006: Add user scenario and enhanced valuation fields
-- Safe additive migration — no breaking changes

ALTER TABLE `property_submissions`
  ADD COLUMN `userScenario` enum('primary_residence','rental_property','vacation_home','inherited_property','recently_purchased','planning_to_sell','distressed_condition','new_construction','recently_renovated','none') DEFAULT 'none' AFTER `propertyType`,
  ADD COLUMN `conditionNotes` text AFTER `userScenario`,
  ADD COLUMN `taxRateOverride` decimal(5,4) DEFAULT NULL AFTER `potentialSavings`,
  ADD COLUMN `estimatedMarketValueLow` int DEFAULT NULL AFTER `marketValue`,
  ADD COLUMN `estimatedMarketValueHigh` int DEFAULT NULL AFTER `estimatedMarketValueLow`,
  ADD COLUMN `confidenceScore` int DEFAULT NULL AFTER `appealStrengthScore`,
  ADD COLUMN `compQualityScore` int DEFAULT NULL AFTER `confidenceScore`;

ALTER TABLE `property_analysis`
  ADD COLUMN `scenarioContext` text AFTER `nextSteps`,
  ADD COLUMN `valuationApproachWeights` text AFTER `scenarioContext`,
  ADD COLUMN `compQualityBreakdown` text AFTER `valuationApproachWeights`;

-- Index for filtering by scenario (useful for analytics)
CREATE INDEX `idx_submissions_scenario` ON `property_submissions` (`userScenario`);
