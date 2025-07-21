CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"user_id" integer,
	"device_id" varchar(255),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "break_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"offline_guid" uuid NOT NULL,
	"time_entry_id" integer NOT NULL,
	"break_type_id" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_minutes" integer,
	"notes" text,
	"is_synced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "break_entries_offline_guid_unique" UNIQUE("offline_guid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "break_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_paid" boolean NOT NULL,
	"default_minutes" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"tags" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "licences" (
	"id" serial PRIMARY KEY NOT NULL,
	"licence_id" varchar(255) NOT NULL,
	"seats_max" integer NOT NULL,
	"expiry_updates" timestamp,
	"signature" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_by" varchar(255),
	CONSTRAINT "licences_licence_id_unique" UNIQUE("licence_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"offline_guid" uuid NOT NULL,
	"time_entry_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"file_path" text,
	"file_size" integer,
	"mime_type" varchar(100),
	"width" integer,
	"height" integer,
	"taken_at" timestamp NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"is_synced" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "photos_offline_guid_unique" UNIQUE("offline_guid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" varchar(255) NOT NULL,
	"sync_type" varchar(50) NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_succeeded" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"error_details" jsonb,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"status" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"offline_guid" uuid NOT NULL,
	"worker_id" integer NOT NULL,
	"job_id" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"start_latitude" numeric(10, 7),
	"start_longitude" numeric(10, 7),
	"end_latitude" numeric(10, 7),
	"end_longitude" numeric(10, 7),
	"notes" text,
	"regular_hours" numeric(8, 2),
	"overtime_hours" numeric(8, 2),
	"is_synced" boolean DEFAULT false NOT NULL,
	"has_conflict" boolean DEFAULT false NOT NULL,
	"conflict_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "time_entries_offline_guid_unique" UNIQUE("offline_guid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workers" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"pin" varchar(4) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_job_code_idx" ON "jobs" ("job_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workers_employee_id_idx" ON "workers" ("employee_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "break_entries" ADD CONSTRAINT "break_entries_time_entry_id_time_entries_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "break_entries" ADD CONSTRAINT "break_entries_break_type_id_break_types_id_fk" FOREIGN KEY ("break_type_id") REFERENCES "break_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "photos" ADD CONSTRAINT "photos_time_entry_id_time_entries_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
