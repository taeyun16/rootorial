CREATE TABLE `course_visitors` (
	`user_id` text NOT NULL,
	`curriculum_slug` text NOT NULL,
	`first_accessed_at` integer NOT NULL,
	`last_accessed_at` integer NOT NULL,
	`access_count` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`user_id`, `curriculum_slug`),
	CONSTRAINT "course_visitors_access_count_check" CHECK("course_visitors"."access_count" > 0)
);
--> statement-breakpoint
CREATE INDEX `course_visitors_curriculum_last_idx` ON `course_visitors` (`curriculum_slug`,`last_accessed_at`);