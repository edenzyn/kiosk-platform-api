CREATE TABLE "license_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"duration_days" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "reseller_discount_rule_mapper" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reseller_id" uuid NOT NULL,
	"discount_rule_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "reseller_discount_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"discount_type" smallint NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"max_quantity" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "license_purchase_items" RENAME TO "license_transaction_items";--> statement-breakpoint
ALTER TABLE "license_purchases" RENAME TO "license_transactions";--> statement-breakpoint
ALTER TABLE "license_history" RENAME COLUMN "purchase_id" TO "transaction_id";--> statement-breakpoint
ALTER TABLE "license_transaction_items" RENAME COLUMN "purchase_id" TO "transaction_id";--> statement-breakpoint
ALTER TABLE "license_transaction_items" RENAME COLUMN "price" TO "unit_price";--> statement-breakpoint
ALTER TABLE "license_transactions" RENAME COLUMN "reseller_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "license_transactions" RENAME COLUMN "purchased_at" TO "transaction_at";--> statement-breakpoint
ALTER TABLE "license_history" DROP CONSTRAINT "license_history_purchase_id_license_purchases_id_fk";
--> statement-breakpoint
ALTER TABLE "license_transaction_items" DROP CONSTRAINT "license_purchase_items_purchase_id_license_purchases_id_fk";
--> statement-breakpoint
ALTER TABLE "license_transaction_items" DROP CONSTRAINT "license_purchase_items_license_id_licenses_id_fk";
--> statement-breakpoint
ALTER TABLE "license_transactions" DROP CONSTRAINT "license_purchases_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "license_transactions" DROP CONSTRAINT "license_purchases_reseller_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "license_transactions" DROP CONSTRAINT "license_purchases_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "license_transactions" DROP CONSTRAINT "license_purchases_updated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "license_key" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "license_transaction_items" ADD COLUMN "action_type" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "license_transaction_items" ADD COLUMN "base_unit_price" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "license_transaction_items" ADD COLUMN "discount_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "transaction_type" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "subtotal_amount" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "discount_percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "applied_discount_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "license_pricing" ADD CONSTRAINT "license_pricing_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_pricing" ADD CONSTRAINT "license_pricing_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_discount_rule_mapper" ADD CONSTRAINT "reseller_discount_rule_mapper_reseller_id_users_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_discount_rule_mapper" ADD CONSTRAINT "reseller_discount_rule_mapper_discount_rule_id_reseller_discount_rules_id_fk" FOREIGN KEY ("discount_rule_id") REFERENCES "public"."reseller_discount_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_discount_rule_mapper" ADD CONSTRAINT "reseller_discount_rule_mapper_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_discount_rule_mapper" ADD CONSTRAINT "reseller_discount_rule_mapper_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_discount_rules" ADD CONSTRAINT "reseller_discount_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_discount_rules" ADD CONSTRAINT "reseller_discount_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_history" ADD CONSTRAINT "license_history_transaction_id_license_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."license_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transaction_items" ADD CONSTRAINT "license_transaction_items_transaction_id_license_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."license_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transaction_items" ADD CONSTRAINT "license_transaction_items_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD CONSTRAINT "license_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD CONSTRAINT "license_transactions_applied_discount_rule_id_reseller_discount_rules_id_fk" FOREIGN KEY ("applied_discount_rule_id") REFERENCES "public"."reseller_discount_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD CONSTRAINT "license_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD CONSTRAINT "license_transactions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transactions" DROP COLUMN "organization_id";--> statement-breakpoint
ALTER TABLE "license_transactions" DROP COLUMN "quantity";