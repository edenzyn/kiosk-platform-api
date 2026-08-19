ALTER TABLE "user_two_factor_auth" DROP CONSTRAINT "user_two_factor_auth_user_id_users_id_fk";
--> statement-breakpoint
DROP TABLE "user_two_factor_auth";
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "two_factor_method" varchar(20);
