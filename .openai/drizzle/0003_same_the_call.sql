CREATE TABLE `weekly_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'telegram' NOT NULL,
	`external_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_activities_external_id_unique` ON `weekly_activities` (`external_id`);--> statement-breakpoint
CREATE INDEX `idx_weekly_activities_start_at` ON `weekly_activities` (`start_at`);