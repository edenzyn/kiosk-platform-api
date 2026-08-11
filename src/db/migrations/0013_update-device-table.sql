ALTER TABLE "devices" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "pin" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "pin" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "device_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "license_purchases" ADD COLUMN "payment_provider" smallint;