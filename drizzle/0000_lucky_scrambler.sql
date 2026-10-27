CREATE TABLE `product_first_seen` (
	`source_key` text PRIMARY KEY NOT NULL,
	`first_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ticket_interests` (
	`visitor_id` text NOT NULL,
	`source_key` text NOT NULL,
	PRIMARY KEY(`visitor_id`, `source_key`)
);
