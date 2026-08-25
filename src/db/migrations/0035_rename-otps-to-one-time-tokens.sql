-- The table no longer holds only one-time *passwords*: alongside 6-digit 2FA
-- and contact-change codes it now stores identity step-up codes and long
-- password-reset link tokens. Renamed to describe what every row actually is —
-- a single-use secret with an expiry.
ALTER TABLE "otps" RENAME TO "one_time_tokens";
--> statement-breakpoint
ALTER TABLE "one_time_tokens" RENAME COLUMN "code_hash" TO "token_hash";
--> statement-breakpoint
ALTER INDEX "otps_pkey" RENAME TO "one_time_tokens_pkey";
--> statement-breakpoint
ALTER INDEX "otps_user_id_type_created_at_idx" RENAME TO "one_time_tokens_user_id_type_created_at_idx";
--> statement-breakpoint
ALTER INDEX "otps_expires_at_idx" RENAME TO "one_time_tokens_expires_at_idx";
--> statement-breakpoint
ALTER TABLE "one_time_tokens" RENAME CONSTRAINT "otps_user_id_users_id_fk" TO "one_time_tokens_user_id_users_id_fk";
