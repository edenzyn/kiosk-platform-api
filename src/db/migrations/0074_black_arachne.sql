DROP INDEX "orders_business_day_token_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "orders_business_day_token_idx" ON "orders" USING btree ("business_day_id","token_number");