CREATE TABLE `content_publication_overrides` (
	`resource_key` text PRIMARY KEY NOT NULL,
	`resource_kind` text NOT NULL,
	`curriculum_slug` text NOT NULL,
	`chapter_slug` text,
	`publication_status` text NOT NULL,
	`listing` text NOT NULL,
	`scheduled_at` integer,
	`published_at` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "content_publication_overrides_resource_kind_check" CHECK("content_publication_overrides"."resource_kind" in ('curriculum', 'chapter')),
	CONSTRAINT "content_publication_overrides_resource_identity_check" CHECK(("content_publication_overrides"."resource_kind" = 'curriculum' and "content_publication_overrides"."chapter_slug" is null and "content_publication_overrides"."resource_key" = 'curriculum:' || "content_publication_overrides"."curriculum_slug") or ("content_publication_overrides"."resource_kind" = 'chapter' and "content_publication_overrides"."chapter_slug" is not null and "content_publication_overrides"."resource_key" = 'chapter:' || "content_publication_overrides"."curriculum_slug" || '/' || "content_publication_overrides"."chapter_slug")),
	CONSTRAINT "content_publication_overrides_status_check" CHECK("content_publication_overrides"."publication_status" in ('draft', 'published', 'archived')),
	CONSTRAINT "content_publication_overrides_listing_check" CHECK("content_publication_overrides"."listing" in ('hidden', 'listed', 'unlisted')),
	CONSTRAINT "content_publication_overrides_schedule_check" CHECK("content_publication_overrides"."publication_status" = 'draft' or "content_publication_overrides"."scheduled_at" is null),
	CONSTRAINT "content_publication_overrides_published_at_check" CHECK("content_publication_overrides"."publication_status" = 'draft' or "content_publication_overrides"."published_at" is not null),
	CONSTRAINT "content_publication_overrides_version_check" CHECK("content_publication_overrides"."version" > 0)
);
--> statement-breakpoint
CREATE INDEX `content_publication_overrides_curriculum_idx` ON `content_publication_overrides` (`curriculum_slug`,`chapter_slug`);--> statement-breakpoint
CREATE INDEX `content_publication_overrides_schedule_idx` ON `content_publication_overrides` (`publication_status`,`scheduled_at`);