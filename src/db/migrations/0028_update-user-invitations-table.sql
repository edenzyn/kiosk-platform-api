ALTER TABLE "reseller_discount_rules" RENAME TO "license_discount_rules";--> statement-breakpoint
ALTER TABLE "license_pricing_discount_rule_mapper" DROP CONSTRAINT "license_pricing_discount_rule_mapper_discount_rule_id_reseller_discount_rules_id_fk";
--> statement-breakpoint
ALTER TABLE "license_transactions" DROP CONSTRAINT "license_transactions_applied_discount_rule_id_reseller_discount_rules_id_fk";
--> statement-breakpoint
ALTER TABLE "reseller_discount_rule_mapper" DROP CONSTRAINT "reseller_discount_rule_mapper_discount_rule_id_reseller_discount_rules_id_fk";
--> statement-breakpoint
ALTER TABLE "license_discount_rules" DROP CONSTRAINT "reseller_discount_rules_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "license_discount_rules" DROP CONSTRAINT "reseller_discount_rules_updated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "theme_mode" SET DEFAULT 'system';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "registered_name" varchar(255);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "registration_number" varchar(100);--> statement-breakpoint
ALTER TABLE "license_discount_rules" ADD COLUMN "target_entity" smallint NOT NULL;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD COLUMN "is_org_registration" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD COLUMN "organization_name" varchar(255);--> statement-breakpoint
ALTER TABLE "license_pricing_discount_rule_mapper" ADD CONSTRAINT "license_pricing_discount_rule_mapper_discount_rule_id_license_discount_rules_id_fk" FOREIGN KEY ("discount_rule_id") REFERENCES "public"."license_discount_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD CONSTRAINT "license_transactions_applied_discount_rule_id_license_discount_rules_id_fk" FOREIGN KEY ("applied_discount_rule_id") REFERENCES "public"."license_discount_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_discount_rule_mapper" ADD CONSTRAINT "reseller_discount_rule_mapper_discount_rule_id_license_discount_rules_id_fk" FOREIGN KEY ("discount_rule_id") REFERENCES "public"."license_discount_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_discount_rules" ADD CONSTRAINT "license_discount_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_discount_rules" ADD CONSTRAINT "license_discount_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;