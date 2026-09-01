ALTER TABLE "license_redemption_items" RENAME COLUMN "currency" TO "base_price_currency";--> statement-breakpoint
ALTER TABLE "license_redemption_codes" RENAME COLUMN "currency" TO "sold_price_currency";
