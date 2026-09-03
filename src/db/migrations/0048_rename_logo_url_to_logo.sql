ALTER TABLE "branch_settings" RENAME COLUMN "logo_url" TO "logo";--> statement-breakpoint
ALTER TABLE "organization_settings" RENAME COLUMN "logo_url" TO "logo";--> statement-breakpoint
ALTER TABLE "branch_settings" ALTER COLUMN "logo" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "organization_settings" ALTER COLUMN "logo" SET DATA TYPE varchar(255);
