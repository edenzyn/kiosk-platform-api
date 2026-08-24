ALTER TABLE "license_pricing" ADD COLUMN "device_type" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "device_type" smallint DEFAULT 1 NOT NULL;