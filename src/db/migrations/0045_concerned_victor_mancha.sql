ALTER TABLE "organizations" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "area" varchar(255);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "landmark" varchar(255);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "timezone" varchar(100);