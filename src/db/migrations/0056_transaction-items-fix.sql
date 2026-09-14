ALTER TABLE "license_transactions" RENAME COLUMN "total_tax_amount" TO "tax_amount";--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "amount_before_tax" numeric(10, 2) NOT NULL;