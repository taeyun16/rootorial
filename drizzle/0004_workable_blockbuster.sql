CREATE TABLE `learning_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`submission_id` text NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`curriculum_slug` text NOT NULL,
	`chapter_slug` text NOT NULL,
	`question_id` text NOT NULL,
	`question_version` integer NOT NULL,
	`selected_answer` text NOT NULL,
	`is_correct` integer NOT NULL,
	`attempt_number` integer NOT NULL,
	`submitted_at` integer NOT NULL,
	CONSTRAINT "learning_attempts_version_check" CHECK("learning_attempts"."question_version" > 0),
	CONSTRAINT "learning_attempts_attempt_check" CHECK("learning_attempts"."attempt_number" > 0)
);
--> statement-breakpoint
CREATE INDEX `learning_attempts_submitted_idx` ON `learning_attempts` (`submitted_at`);--> statement-breakpoint
CREATE INDEX `learning_attempts_user_submitted_idx` ON `learning_attempts` (`user_id`,`submitted_at`);--> statement-breakpoint
CREATE INDEX `learning_attempts_question_submitted_idx` ON `learning_attempts` (`curriculum_slug`,`chapter_slug`,`question_id`,`submitted_at`);--> statement-breakpoint
CREATE INDEX `learning_attempts_session_question_idx` ON `learning_attempts` (`session_id`,`question_id`,`attempt_number`);--> statement-breakpoint
CREATE TABLE `learning_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`curriculum_slug` text NOT NULL,
	`chapter_slug` text NOT NULL,
	`locale` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer NOT NULL,
	`elapsed_seconds` integer NOT NULL,
	`dwell_seconds` integer NOT NULL,
	`active_seconds` integer NOT NULL,
	`heartbeat_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "learning_sessions_locale_check" CHECK("learning_sessions"."locale" in ('ko', 'en')),
	CONSTRAINT "learning_sessions_duration_check" CHECK("learning_sessions"."elapsed_seconds" >= 0 and "learning_sessions"."dwell_seconds" >= 0 and "learning_sessions"."active_seconds" >= 0 and "learning_sessions"."active_seconds" <= "learning_sessions"."dwell_seconds" and "learning_sessions"."dwell_seconds" <= "learning_sessions"."elapsed_seconds")
);
--> statement-breakpoint
CREATE INDEX `learning_sessions_started_idx` ON `learning_sessions` (`started_at`);--> statement-breakpoint
CREATE INDEX `learning_sessions_user_started_idx` ON `learning_sessions` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `learning_sessions_chapter_started_idx` ON `learning_sessions` (`curriculum_slug`,`chapter_slug`,`started_at`);