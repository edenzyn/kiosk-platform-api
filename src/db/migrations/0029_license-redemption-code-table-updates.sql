ALTER TABLE "refresh_tokens" RENAME TO "auth_sessions";--> statement-breakpoint
ALTER TABLE "auth_sessions" DROP CONSTRAINT "refresh_tokens_token_hash_unique";--> statement-breakpoint
ALTER TABLE "auth_sessions" DROP CONSTRAINT "refresh_tokens_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "auth_sessions" DROP CONSTRAINT "refresh_tokens_device_id_devices_id_fk";
--> statement-breakpoint
DROP INDEX "refresh_tokens_user_id_idx";--> statement-breakpoint
DROP INDEX "refresh_tokens_device_id_idx";--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "ip_address" varchar(45);--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "device_name" varchar(150);--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD COLUMN "last_used_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "license_redemption_codes" ADD COLUMN "sold_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "license_redemption_codes" ADD COLUMN "currency" varchar(10);--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "currency_code" varchar(3) DEFAULT 'INR' NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_device_id_idx" ON "auth_sessions" USING btree ("device_id");--> statement-breakpoint
ALTER TABLE "auth_sessions" DROP COLUMN "replaced_by_token_id";--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash");