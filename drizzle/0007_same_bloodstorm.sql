CREATE TABLE `notification_deliveries` (
	`event_id` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_attempt_at` integer,
	`external_message_id` text,
	`delivered_at` integer,
	PRIMARY KEY(`event_id`, `channel`),
	FOREIGN KEY (`event_id`) REFERENCES `system_events`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "notification_deliveries_channel_check" CHECK("notification_deliveries"."channel" = 'discord'),
	CONSTRAINT "notification_deliveries_status_check" CHECK("notification_deliveries"."status" in ('pending', 'sent', 'failed')),
	CONSTRAINT "notification_deliveries_attempts_check" CHECK("notification_deliveries"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX `notification_deliveries_status_attempt_idx` ON `notification_deliveries` (`status`,`last_attempt_at`);--> statement-breakpoint
CREATE TABLE `system_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`actor_user_id` text,
	`entity_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_error_code` text,
	`created_at` integer NOT NULL,
	`queued_at` integer,
	`delivered_at` integer,
	CONSTRAINT "system_events_type_check" CHECK("system_events"."type" in ('feedback.created', 'discussion.question.created', 'user.created')),
	CONSTRAINT "system_events_status_check" CHECK("system_events"."status" in ('pending', 'queued', 'delivered', 'dead')),
	CONSTRAINT "system_events_attempt_count_check" CHECK("system_events"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `system_events_status_created_idx` ON `system_events` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `system_events_type_created_idx` ON `system_events` (`type`,`created_at`);