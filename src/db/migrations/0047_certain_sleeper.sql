ALTER TABLE "branch_settings" ADD COLUMN "timezone" varchar(100) DEFAULT 'Asia/Kolkata' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD COLUMN "timezone" varchar(100) DEFAULT 'Asia/Kolkata' NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" DROP COLUMN "timezone";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "timezone";