ALTER TABLE "user_settings" ALTER COLUMN "two_factor_method" TYPE smallint USING NULL;
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "two_factor_secret" varchar(255);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "two_factor_backup_code_hashes" jsonb;
