CREATE TABLE `discussion_answer_likes` (
	`answer_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`answer_id`, `user_id`),
	FOREIGN KEY (`answer_id`) REFERENCES `discussion_answers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `discussion_profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `discussion_answer_likes_user_answer_idx` ON `discussion_answer_likes` (`user_id`,`answer_id`);--> statement-breakpoint
CREATE TABLE `discussion_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`author_user_id` text NOT NULL,
	`kind` text DEFAULT 'community' NOT NULL,
	`body` text NOT NULL,
	`state` text DEFAULT 'visible' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`moderated_by_user_id` text,
	`moderated_at` integer,
	`moderation_reason` text,
	FOREIGN KEY (`question_id`) REFERENCES `discussion_questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_user_id`) REFERENCES `discussion_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`moderated_by_user_id`) REFERENCES `discussion_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "discussion_answers_kind_check" CHECK("discussion_answers"."kind" in ('community', 'official')),
	CONSTRAINT "discussion_answers_state_check" CHECK("discussion_answers"."state" in ('visible', 'hidden', 'deleted')),
	CONSTRAINT "discussion_answers_body_check" CHECK("discussion_answers"."state" = 'deleted' or length(trim("discussion_answers"."body")) between 1 and 4000),
	CONSTRAINT "discussion_answers_moderation_check" CHECK("discussion_answers"."state" != 'hidden' or ("discussion_answers"."moderated_by_user_id" is not null and "discussion_answers"."moderated_at" is not null and length(trim("discussion_answers"."moderation_reason")) between 1 and 500))
);
--> statement-breakpoint
CREATE INDEX `discussion_answers_question_state_created_idx` ON `discussion_answers` (`question_id`,`state`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `discussion_answers_author_created_idx` ON `discussion_answers` (`author_user_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `discussion_moderation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `discussion_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "discussion_moderation_events_target_type_check" CHECK("discussion_moderation_events"."target_type" in ('question', 'answer')),
	CONSTRAINT "discussion_moderation_events_action_check" CHECK("discussion_moderation_events"."action" in ('hide', 'restore')),
	CONSTRAINT "discussion_moderation_events_reason_length" CHECK(length(trim("discussion_moderation_events"."reason")) between 1 and 500)
);
--> statement-breakpoint
CREATE INDEX `discussion_moderation_events_target_created_idx` ON `discussion_moderation_events` (`target_type`,`target_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `discussion_moderation_events_actor_created_idx` ON `discussion_moderation_events` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `discussion_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`image_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "discussion_profiles_display_name_length" CHECK(length(trim("discussion_profiles"."display_name")) between 1 and 80)
);
--> statement-breakpoint
CREATE TABLE `discussion_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_id` text NOT NULL,
	`author_user_id` text NOT NULL,
	`body` text NOT NULL,
	`state` text DEFAULT 'visible' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`moderated_by_user_id` text,
	`moderated_at` integer,
	`moderation_reason` text,
	FOREIGN KEY (`author_user_id`) REFERENCES `discussion_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`moderated_by_user_id`) REFERENCES `discussion_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "discussion_questions_scope_length" CHECK(length("discussion_questions"."scope_id") between 3 and 120),
	CONSTRAINT "discussion_questions_state_check" CHECK("discussion_questions"."state" in ('visible', 'hidden', 'deleted')),
	CONSTRAINT "discussion_questions_body_check" CHECK("discussion_questions"."state" = 'deleted' or length(trim("discussion_questions"."body")) between 1 and 2000),
	CONSTRAINT "discussion_questions_moderation_check" CHECK("discussion_questions"."state" != 'hidden' or ("discussion_questions"."moderated_by_user_id" is not null and "discussion_questions"."moderated_at" is not null and length(trim("discussion_questions"."moderation_reason")) between 1 and 500))
);
--> statement-breakpoint
CREATE INDEX `discussion_questions_scope_state_created_idx` ON `discussion_questions` (`scope_id`,`state`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `discussion_questions_author_created_idx` ON `discussion_questions` (`author_user_id`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `discussion_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`window_kind` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `discussion_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "discussion_rate_limits_action_check" CHECK("discussion_rate_limits"."action" in ('question', 'answer', 'social')),
	CONSTRAINT "discussion_rate_limits_window_kind_check" CHECK("discussion_rate_limits"."window_kind" in ('burst', 'daily')),
	CONSTRAINT "discussion_rate_limits_count_check" CHECK("discussion_rate_limits"."count" > 0)
);
--> statement-breakpoint
CREATE INDEX `discussion_rate_limits_window_start_idx` ON `discussion_rate_limits` (`window_start`);--> statement-breakpoint
CREATE TABLE `discussion_user_blocks` (
	`blocker_user_id` text NOT NULL,
	`blocked_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`blocker_user_id`, `blocked_user_id`),
	FOREIGN KEY (`blocker_user_id`) REFERENCES `discussion_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`blocked_user_id`) REFERENCES `discussion_profiles`(`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "discussion_user_blocks_not_self" CHECK("discussion_user_blocks"."blocker_user_id" != "discussion_user_blocks"."blocked_user_id")
);
--> statement-breakpoint
CREATE INDEX `discussion_user_blocks_blocked_blocker_idx` ON `discussion_user_blocks` (`blocked_user_id`,`blocker_user_id`);