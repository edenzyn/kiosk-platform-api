ALTER TABLE "app_tax_components" ALTER COLUMN "rate" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "license_transaction_taxes" ALTER COLUMN "tax_rate" SET DATA TYPE numeric(10, 2);