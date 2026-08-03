ALTER TABLE "roles" ADD COLUMN "rank" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;