CREATE TABLE `content_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`author_user_id` text NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`page_path` text NOT NULL,
	`page_title` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "content_feedback_kind_check" CHECK("content_feedback"."kind" in ('incorrect', 'confusing', 'suggestion')),
	CONSTRAINT "content_feedback_message_length" CHECK(length(trim("content_feedback"."message")) between 1 and 2000),
	CONSTRAINT "content_feedback_page_path_length" CHECK(length("content_feedback"."page_path") between 1 and 500),
	CONSTRAINT "content_feedback_page_title_length" CHECK(length(trim("content_feedback"."page_title")) between 1 and 200)
);
--> statement-breakpoint
CREATE INDEX `content_feedback_author_created_idx` ON `content_feedback` (`author_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_feedback_page_created_idx` ON `content_feedback` (`page_path`,`created_at`);