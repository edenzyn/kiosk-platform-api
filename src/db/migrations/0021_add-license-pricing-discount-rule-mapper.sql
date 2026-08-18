CREATE TABLE "license_pricing_discount_rule_mapper" (
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
ALTER TABLE "license_pricing_discount_rule_mapper" ADD CONSTRAINT "license_pricing_discount_rule_mapper_pricing_id_license_pricing_id_fk" FOREIGN KEY ("pricing_id") REFERENCES "public"."license_pricing"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_pricing_discount_rule_mapper" ADD CONSTRAINT "license_pricing_discount_rule_mapper_discount_rule_id_reseller_discount_rules_id_fk" FOREIGN KEY ("discount_rule_id") REFERENCES "public"."reseller_discount_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_pricing_discount_rule_mapper" ADD CONSTRAINT "license_pricing_discount_rule_mapper_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_pricing_discount_rule_mapper" ADD CONSTRAINT "license_pricing_discount_rule_mapper_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
