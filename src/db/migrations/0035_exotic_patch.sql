ALTER TABLE "license_transactions" ADD COLUMN "intent_payload" jsonb;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "failure_reason" text;