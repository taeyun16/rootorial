CREATE TABLE `content_impressions` (
	`path` text PRIMARY KEY NOT NULL,
	`curriculum_slug` text NOT NULL,
	`chapter_slug` text,
	`view_count` integer DEFAULT 0 NOT NULL,
	`signed_in_view_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "content_impressions_counts_check" CHECK("content_impressions"."view_count" >= 0 and "content_impressions"."signed_in_view_count" >= 0 and "content_impressions"."signed_in_view_count" <= "content_impressions"."view_count")
);
--> statement-breakpoint
CREATE INDEX `content_impressions_curriculum_idx` ON `content_impressions` (`curriculum_slug`);--> statement-breakpoint
CREATE INDEX `content_impressions_chapter_idx` ON `content_impressions` (`curriculum_slug`,`chapter_slug`);--> statement-breakpoint
CREATE TABLE `content_visitors` (
	`user_id` text NOT NULL,
	`path` text NOT NULL,
	`curriculum_slug` text NOT NULL,
	`chapter_slug` text,
	`first_accessed_at` integer NOT NULL,
	`last_accessed_at` integer NOT NULL,
	`access_count` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`user_id`, `path`),
	CONSTRAINT "content_visitors_access_count_check" CHECK("content_visitors"."access_count" > 0)
);
--> statement-breakpoint
CREATE INDEX `content_visitors_path_idx` ON `content_visitors` (`path`);--> statement-breakpoint
CREATE INDEX `content_visitors_curriculum_idx` ON `content_visitors` (`curriculum_slug`,`chapter_slug`);