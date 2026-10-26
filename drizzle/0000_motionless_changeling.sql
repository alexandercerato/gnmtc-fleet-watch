CREATE TABLE `destination_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`imo` text NOT NULL,
	`recorded_at` text NOT NULL,
	`from_port` text,
	`to_port` text,
	`source_url` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monitor_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refresh_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`completed_at` text NOT NULL,
	`verified_count` integer NOT NULL,
	`unavailable_count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vessel_states` (
	`imo` text PRIMARY KEY NOT NULL,
	`checked_at` text NOT NULL,
	`payload` text NOT NULL
);
