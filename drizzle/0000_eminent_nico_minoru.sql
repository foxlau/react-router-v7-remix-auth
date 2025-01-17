CREATE TABLE `accounts` (
	`id` text(24) NOT NULL,
	`user_id` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`provider` text NOT NULL,
	`scopes` text,
	`id_token` text,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_id_unique` ON `accounts` (`id`);--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_account_unq` ON `accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE TABLE `passwords` (
	`user_id` text NOT NULL,
	`hash` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `passwords_user_id_unq` ON `passwords` (`user_id`);--> statement-breakpoint
CREATE TABLE `todos` (
	`id` text(24) NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `todos_id_unique` ON `todos` (`id`);--> statement-breakpoint
CREATE INDEX `todos_user_id_idx` ON `todos` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text(24) NOT NULL,
	`username` text NOT NULL,
	`display_name` text,
	`email` text NOT NULL,
	`avatar_url` text,
	`bio` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_id_unique` ON `users` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unq_idx` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unq_idx` ON `users` (`email`);