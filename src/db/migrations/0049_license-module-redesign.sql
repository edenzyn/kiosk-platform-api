CREATE TABLE "license_plan_discount_rule_mapper" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pricing_id" uuid NOT NULL,
	"discount_rule_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "license_plan_discount_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"target_entity" integer NOT NULL,
	"discount_type" integer NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"scope_type" integer NOT NULL,
	"market_id" uuid,
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
CREATE TABLE "license_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"device_type" integer NOT NULL,
	"duration_days" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "license_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"locked_plan_name" varchar(100) NOT NULL,
	"market_id" uuid NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"locked_price" numeric(10, 2) NOT NULL,
	"duration_days" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "license_plan_market_mapper" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"name" varchar(100) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "markets_country_code_unique" UNIQUE("country_code")
);
--> statement-breakpoint
CREATE TABLE "organization_market_mapper" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reseller_market_mapper" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reseller_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "license_discount_rules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "license_pricing_discount_rule_mapper" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "license_pricing" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "license_redemption_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "license_discount_rules" CASCADE;--> statement-breakpoint
DROP TABLE "license_pricing_discount_rule_mapper" CASCADE;--> statement-breakpoint
DROP TABLE "license_pricing" CASCADE;--> statement-breakpoint
DROP TABLE "license_redemption_items" CASCADE;--> statement-breakpoint
ALTER TABLE "license_transaction_items" RENAME COLUMN "pricing_plan_id" TO "plan_id";--> statement-breakpoint
ALTER TABLE "license_transaction_items" RENAME COLUMN "action_type" TO "transaction_type";--> statement-breakpoint
ALTER TABLE "license_transaction_items" RENAME COLUMN "unit_price" TO "final_unit_price";--> statement-breakpoint
ALTER TABLE "license_transaction_items" DROP CONSTRAINT "license_transaction_items_pricing_plan_id_license_pricing_id_fk";
--> statement-breakpoint
ALTER TABLE "license_transactions" DROP CONSTRAINT "license_transactions_applied_discount_rule_id_license_discount_rules_id_fk";
--> statement-breakpoint
ALTER TABLE "reseller_discount_rule_mapper" DROP CONSTRAINT "reseller_discount_rule_mapper_discount_rule_id_license_discount_rules_id_fk";
--> statement-breakpoint
ALTER TABLE "license_transaction_items" ALTER COLUMN "plan_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "license_transaction_items" ALTER COLUMN "plan_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "market_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "license_history" ADD COLUMN "previous_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "license_history" ADD COLUMN "new_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "license_redemption_codes" ADD COLUMN "market_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "license_redemption_codes" ADD COLUMN "license_ids" uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "license_transaction_items" ADD COLUMN "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "market_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "transaction_type" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "discount_type" smallint;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "discount_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "market_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "current_plan_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "is_redeemed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "license_plan_discount_rule_mapper" ADD CONSTRAINT "license_plan_discount_rule_mapper_pricing_id_license_plans_id_fk" FOREIGN KEY ("pricing_id") REFERENCES "public"."license_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plan_discount_rule_mapper" ADD CONSTRAINT "license_plan_discount_rule_mapper_discount_rule_id_license_plan_discount_rules_id_fk" FOREIGN KEY ("discount_rule_id") REFERENCES "public"."license_plan_discount_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plan_discount_rule_mapper" ADD CONSTRAINT "license_plan_discount_rule_mapper_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plan_discount_rule_mapper" ADD CONSTRAINT "license_plan_discount_rule_mapper_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plan_discount_rules" ADD CONSTRAINT "license_plan_discount_rules_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plan_discount_rules" ADD CONSTRAINT "license_plan_discount_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plan_discount_rules" ADD CONSTRAINT "license_plan_discount_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plans" ADD CONSTRAINT "license_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plans" ADD CONSTRAINT "license_plans_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_terms" ADD CONSTRAINT "license_terms_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_terms" ADD CONSTRAINT "license_terms_plan_id_license_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."license_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_terms" ADD CONSTRAINT "license_terms_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_terms" ADD CONSTRAINT "license_terms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plan_market_mapper" ADD CONSTRAINT "license_plan_market_mapper_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plan_market_mapper" ADD CONSTRAINT "license_plan_market_mapper_plan_id_license_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."license_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plan_market_mapper" ADD CONSTRAINT "license_plan_market_mapper_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_plan_market_mapper" ADD CONSTRAINT "license_plan_market_mapper_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_market_mapper" ADD CONSTRAINT "organization_market_mapper_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_market_mapper" ADD CONSTRAINT "organization_market_mapper_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_market_mapper" ADD CONSTRAINT "organization_market_mapper_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_market_mapper" ADD CONSTRAINT "organization_market_mapper_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_market_mapper" ADD CONSTRAINT "reseller_market_mapper_reseller_id_users_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_market_mapper" ADD CONSTRAINT "reseller_market_mapper_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_market_mapper" ADD CONSTRAINT "reseller_market_mapper_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_market_mapper" ADD CONSTRAINT "reseller_market_mapper_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "license_plan_market_mapper_market_plan_idx" ON "license_plan_market_mapper" USING btree ("market_id","plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_market_mapper_org_market_idx" ON "organization_market_mapper" USING btree ("organization_id","market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reseller_market_mapper_reseller_market_idx" ON "reseller_market_mapper" USING btree ("reseller_id","market_id");--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_history" ADD CONSTRAINT "license_history_previous_plan_id_license_plans_id_fk" FOREIGN KEY ("previous_plan_id") REFERENCES "public"."license_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_history" ADD CONSTRAINT "license_history_new_plan_id_license_plans_id_fk" FOREIGN KEY ("new_plan_id") REFERENCES "public"."license_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_redemption_codes" ADD CONSTRAINT "license_redemption_codes_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transaction_items" ADD CONSTRAINT "license_transaction_items_plan_id_license_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."license_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD CONSTRAINT "license_transactions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD CONSTRAINT "license_transactions_applied_discount_rule_id_license_plan_discount_rules_id_fk" FOREIGN KEY ("applied_discount_rule_id") REFERENCES "public"."license_plan_discount_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_current_plan_id_license_plans_id_fk" FOREIGN KEY ("current_plan_id") REFERENCES "public"."license_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_discount_rule_mapper" ADD CONSTRAINT "reseller_discount_rule_mapper_discount_rule_id_license_plan_discount_rules_id_fk" FOREIGN KEY ("discount_rule_id") REFERENCES "public"."license_plan_discount_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_redemption_codes" DROP COLUMN "sold_price_currency";--> statement-breakpoint
ALTER TABLE "license_reseller_mapper" DROP COLUMN "assigned_at";--> statement-breakpoint
ALTER TABLE "license_transaction_items" DROP COLUMN "discount_currency";--> statement-breakpoint
ALTER TABLE "license_transactions" DROP COLUMN "discount_percentage";--> statement-breakpoint
ALTER TABLE "license_transactions" DROP COLUMN "currency";