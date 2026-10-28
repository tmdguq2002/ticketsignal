CREATE TABLE `email_deliveries` (
	`subscription_id` text NOT NULL,
	`event_key` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`error` text,
	PRIMARY KEY(`subscription_id`, `event_key`)
);
--> statement-breakpoint
CREATE TABLE `email_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_pending` (
	`email` text PRIMARY KEY NOT NULL,
	`keywords` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`requested_at` text NOT NULL,
	`consent_version` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_pending_token_hash_unique` ON `email_pending` (`token_hash`);--> statement-breakpoint
CREATE TABLE `email_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`keywords` text NOT NULL,
	`verified_at` text NOT NULL,
	`consent_version` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_subscriptions_email_unique` ON `email_subscriptions` (`email`);