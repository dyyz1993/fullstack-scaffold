CREATE TABLE `todos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `todos_status_idx` ON `todos` (`status`);--> statement-breakpoint
CREATE INDEX `todos_tenant_idx` ON `todos` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `todos_created_at_idx` ON `todos` (`created_at`);--> statement-breakpoint
CREATE INDEX `todos_updated_at_idx` ON `todos` (`updated_at`);--> statement-breakpoint
CREATE TABLE `todo_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`todo_id` integer NOT NULL,
	`file_name` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`path` text NOT NULL,
	`uploaded_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`todo_id`) REFERENCES `todos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifications_created_at_idx` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`label` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_code_unique` ON `permissions` (`code`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`is_system` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`sort_order` integer DEFAULT 0,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_code_unique` ON `roles` (`code`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	`created_at` integer,
	PRIMARY KEY(`role_id`, `permission_id`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`assigned_by` text,
	`assigned_at` integer,
	`expires_at` integer,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `routes` (
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
CREATE UNIQUE INDEX `routes_path_method_unique` ON `routes` (`path`,`method`);--> statement-breakpoint
CREATE TABLE `permission_routes` (
	`permission_id` text NOT NULL,
	`route_id` text NOT NULL,
	`created_at` integer,
	PRIMARY KEY(`permission_id`, `route_id`),
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `permission_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`old_value` text,
	`new_value` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_no` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`product_name` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `ticket_replies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` integer NOT NULL,
	`content` text NOT NULL,
	`author` text NOT NULL,
	`is_customer` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ticket_replies_ticket_id_idx` ON `ticket_replies` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_no` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`subject` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`category` text NOT NULL,
	`assigned_to` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tickets_status_idx` ON `tickets` (`status`);--> statement-breakpoint
CREATE INDEX `tickets_created_at_idx` ON `tickets` (`created_at`);--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dispute_no` text NOT NULL,
	`order_id` text NOT NULL,
	`order_no` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`description` text NOT NULL,
	`resolution` text,
	`amount` integer NOT NULL,
	`resolved_at` integer,
	`resolved_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `disputes_status_idx` ON `disputes` (`status`);--> statement-breakpoint
CREATE INDEX `disputes_order_id_idx` ON `disputes` (`order_id`);--> statement-breakpoint
CREATE INDEX `disputes_created_at_idx` ON `disputes` (`created_at`);--> statement-breakpoint
CREATE TABLE `contents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`excerpt` text,
	`category` text NOT NULL,
	`tags` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`author` text NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contents_status_idx` ON `contents` (`status`);--> statement-breakpoint
CREATE INDEX `contents_category_idx` ON `contents` (`category`);--> statement-breakpoint
CREATE INDEX `contents_created_at_idx` ON `contents` (`created_at`);--> statement-breakpoint
CREATE TABLE `content_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `content_comments_content_id_idx` ON `content_comments` (`content_id`);--> statement-breakpoint
CREATE INDEX `content_comments_created_at_idx` ON `content_comments` (`created_at`);--> statement-breakpoint
CREATE TABLE `developers` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'developer' NOT NULL,
	`api_key` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `developers_username_unique` ON `developers` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `developers_email_unique` ON `developers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `developers_api_key_unique` ON `developers` (`api_key`);--> statement-breakpoint
CREATE TABLE `plugin_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_categories_name_unique` ON `plugin_categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_categories_slug_unique` ON `plugin_categories` (`slug`);--> statement-breakpoint
CREATE INDEX `plugin_categories_slug_idx` ON `plugin_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `plugin_category_mappings` (
	`plugin_id` text NOT NULL,
	`category_id` text NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `plugin_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_category_mapping_unique` ON `plugin_category_mappings` (`plugin_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `plugin_category_mappings_category_id_idx` ON `plugin_category_mappings` (`category_id`);--> statement-breakpoint
CREATE INDEX `plugin_category_mappings_plugin_id_idx` ON `plugin_category_mappings` (`plugin_id`);--> statement-breakpoint
CREATE TABLE `plugin_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`rating` integer NOT NULL,
	`title` text,
	`content` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_review_user_unique` ON `plugin_reviews` (`plugin_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `plugin_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`version` text NOT NULL,
	`changelog` text,
	`package_url` text,
	`file_size` integer,
	`checksum` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`published_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugin_version_unique` ON `plugin_versions` (`plugin_id`,`version`);--> statement-breakpoint
CREATE INDEX `plugin_versions_plugin_id_idx` ON `plugin_versions` (`plugin_id`);--> statement-breakpoint
CREATE TABLE `plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`readme` text,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`repository_url` text,
	`homepage_url` text,
	`npm_package` text,
	`license` text,
	`version` text DEFAULT '0.0.1' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`screenshot_url` text,
	`site_urls` text,
	`tags` text,
	`commands` text,
	`reject_reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plugins_slug_unique` ON `plugins` (`slug`);--> statement-breakpoint
CREATE INDEX `plugins_status_idx` ON `plugins` (`status`);--> statement-breakpoint
CREATE INDEX `plugins_slug_idx` ON `plugins` (`slug`);--> statement-breakpoint
CREATE INDEX `plugins_author_id_idx` ON `plugins` (`author_id`);--> statement-breakpoint
CREATE INDEX `plugins_created_at_idx` ON `plugins` (`created_at`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'trial' NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`max_users` integer DEFAULT 5 NOT NULL,
	`settings` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);--> statement-breakpoint
CREATE TABLE `tenant_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`permissions` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_roles_tenant_id_code_unique` ON `tenant_roles` (`tenant_id`,`code`);--> statement-breakpoint
CREATE TABLE `tenant_members` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`invited_by` text,
	`invited_at` text,
	`joined_at` text NOT NULL,
	`last_active_at` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `tenant_roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_members_user_id_tenant_id_unique` ON `tenant_members` (`user_id`,`tenant_id`);--> statement-breakpoint
CREATE TABLE `tenant_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`email` text NOT NULL,
	`role_id` text NOT NULL,
	`inviter_id` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `tenant_roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_invitations_token_unique` ON `tenant_invitations` (`token`);--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`tenant_id` integer NOT NULL,
	`business_name` text NOT NULL,
	`business_type` text DEFAULT 'retail' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`description` text,
	`phone` text,
	`email` text,
	`address` text,
	`password` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`image_url` text,
	`merchant_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `products_merchant_id_idx` ON `products` (`merchant_id`);