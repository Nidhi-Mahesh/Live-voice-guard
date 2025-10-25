CREATE TABLE `authentication_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`sv_score` real NOT NULL,
	`cm_score` real NOT NULL,
	`fusion_score` real NOT NULL,
	`final_decision` text NOT NULL,
	`device_id` text NOT NULL,
	`ip_address` text NOT NULL,
	`user_agent` text NOT NULL,
	`audio_duration` real NOT NULL,
	`snr_score` real,
	`audio_quality` text NOT NULL,
	`spoofing_indicators` text,
	`failure_reason` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `device_registry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` text NOT NULL,
	`user_id` text,
	`device_fingerprint` text NOT NULL,
	`trust_score` real DEFAULT 50 NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`successful_auths` integer DEFAULT 0 NOT NULL,
	`failed_auths` integer DEFAULT 0 NOT NULL,
	`is_blocked` integer DEFAULT false NOT NULL,
	`block_reason` text,
	`device_info` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `device_registry_device_id_unique` ON `device_registry` (`device_id`);--> statement-breakpoint
CREATE TABLE `voice_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`voice_embedding` text NOT NULL,
	`challenge_phrase` text NOT NULL,
	`enrollment_audio_url` text,
	`device_id` text NOT NULL,
	`enrollment_date` integer NOT NULL,
	`sample_count` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `voice_templates_user_id_unique` ON `voice_templates` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `voice_templates_email_unique` ON `voice_templates` (`email`);