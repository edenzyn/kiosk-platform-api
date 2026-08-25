CREATE TABLE "one_time_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" smallint NOT NULL,
	"channel" smallint NOT NULL,
	"destination" varchar(255) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"attempt_count" smallint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "one_time_tokens" ADD CONSTRAINT "one_time_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "one_time_tokens_user_id_type_created_at_idx" ON "one_time_tokens" USING btree ("user_id","type","created_at");--> statement-breakpoint
CREATE INDEX "one_time_tokens_expires_at_idx" ON "one_time_tokens" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "two_factor_secret";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "two_factor_backup_code_hashes";