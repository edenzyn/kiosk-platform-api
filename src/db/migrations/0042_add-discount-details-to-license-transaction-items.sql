ALTER TABLE "license_transaction_items" ADD COLUMN "discount_type" smallint;--> statement-breakpoint
ALTER TABLE "license_transaction_items" ADD COLUMN "discount_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "license_transaction_items" DROP COLUMN "discount_percentage";
