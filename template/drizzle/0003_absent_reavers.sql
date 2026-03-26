CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`path` text NOT NULL,
	`user_id` text NOT NULL,
	`settings` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_user_id_unique` ON `workspaces` (`user_id`);--> statement-breakpoint
ALTER TABLE `agents` ADD `workspace_id` text NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` DROP COLUMN `user_id`;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `workspace_id` text NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_messages` DROP COLUMN `user_id`;
