ALTER TABLE "branches" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ALTER COLUMN "address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "mobile" varchar(50);--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "country" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "state" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "city" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "postal_code" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "area" varchar(255);--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "landmark" varchar(255);--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "timezone" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "tax_id" varchar(100);