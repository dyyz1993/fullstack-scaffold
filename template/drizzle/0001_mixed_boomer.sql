PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_routes` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`method` text NOT NULL,
	`name` text,
	`description` text,
	`module` text,
	`is_public` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_routes`("id", "path", "method", "name", "description", "module", "is_public", "is_active", "created_at", "updated_at") SELECT "id", "path", "method", "name", "description", "module", "is_public", "is_active", "created_at", "updated_at" FROM `routes`;--> statement-breakpoint
DROP TABLE `routes`;--> statement-breakpoint
ALTER TABLE `__new_routes` RENAME TO `routes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `routes_path_method_unique` ON `routes` (`path`,`method`);