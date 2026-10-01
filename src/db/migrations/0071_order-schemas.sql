DROP INDEX "order_payments_merchant_transaction_id_idx";--> statement-breakpoint
ALTER TABLE "order_payments" DROP COLUMN "merchant_transaction_id";