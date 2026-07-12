PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_content_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`author_user_id` text NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`page_path` text NOT NULL,
	`page_title` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_note` text,
	`reviewed_by_user_id` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT "content_feedback_kind_check" CHECK("__new_content_feedback"."kind" in ('incorrect', 'confusing', 'suggestion')),
	CONSTRAINT "content_feedback_message_length" CHECK(length(trim("__new_content_feedback"."message")) between 1 and 2000),
	CONSTRAINT "content_feedback_page_path_length" CHECK(length("__new_content_feedback"."page_path") between 1 and 500),
	CONSTRAINT "content_feedback_page_title_length" CHECK(length(trim("__new_content_feedback"."page_title")) between 1 and 200),
	CONSTRAINT "content_feedback_status_check" CHECK("__new_content_feedback"."status" in ('pending', 'reviewing', 'resolved')),
	CONSTRAINT "content_feedback_admin_note_length" CHECK("__new_content_feedback"."admin_note" is null or length(trim("__new_content_feedback"."admin_note")) between 1 and 1000)
);
--> statement-breakpoint
INSERT INTO `__new_content_feedback`("id", "author_user_id", "kind", "message", "page_path", "page_title", "status", "admin_note", "reviewed_by_user_id", "reviewed_at", "created_at") SELECT "id", "author_user_id", "kind", "message", "page_path", "page_title", 'pending', NULL, NULL, NULL, "created_at" FROM `content_feedback`;--> statement-breakpoint
DROP TABLE `content_feedback`;--> statement-breakpoint
ALTER TABLE `__new_content_feedback` RENAME TO `content_feedback`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `content_feedback_author_created_idx` ON `content_feedback` (`author_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_feedback_page_created_idx` ON `content_feedback` (`page_path`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_feedback_status_created_idx` ON `content_feedback` (`status`,`created_at`);
