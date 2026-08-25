CREATE TABLE IF NOT EXISTS "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" smallint NOT NULL,
	"channel" smallint NOT NULL,
	"destination" varchar(255) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"attempt_count" smallint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "otps" ADD CONSTRAINT "otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "otps_user_id_type_created_at_idx" ON "otps" USING btree ("user_id","type","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "otps_expires_at_idx" ON "otps" USING btree ("expires_at");
