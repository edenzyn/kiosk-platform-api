ALTER TABLE "licenses" ADD COLUMN "license_key_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_license_key_hash_unique" UNIQUE("license_key_hash");