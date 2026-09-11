CREATE TABLE `sleep_records` (
	`sleep_date` text PRIMARY KEY NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`total_minutes` integer NOT NULL,
	`awake_minutes` integer,
	`rem_minutes` integer,
	`core_minutes` integer,
	`deep_minutes` integer,
	`source` text DEFAULT 'apple_health' NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sleep_records_end_at` ON `sleep_records` (`end_at`);