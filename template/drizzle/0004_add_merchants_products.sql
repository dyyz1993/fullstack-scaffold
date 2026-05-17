-- Create merchants table
CREATE TABLE `merchants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`tenant_id` integer NOT NULL,
	`business_name` text NOT NULL,
	`business_type` text NOT NULL,
	`status` text NOT NULL DEFAULT 'active',
	`description` text,
	`phone` text,
	`email` text,
	`address` text,
	`password` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

-- Create products table
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` real NOT NULL,
	`status` text NOT NULL DEFAULT 'active',
	`stock` integer NOT NULL DEFAULT 0,
	`image_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
