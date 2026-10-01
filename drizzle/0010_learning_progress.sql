CREATE TABLE `learning_completions` (
	`user_id` text NOT NULL,
	`chapter_id` text NOT NULL,
	`completed_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `chapter_id`)
);
--> statement-breakpoint
CREATE TABLE `learning_progress_imports` (
	`user_id` text PRIMARY KEY NOT NULL,
	`imported_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learning_resume` (
	`user_id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`section_id` text NOT NULL,
	`updated_at` integer NOT NULL
);
