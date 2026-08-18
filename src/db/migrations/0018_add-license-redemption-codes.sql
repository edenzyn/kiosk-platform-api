CREATE TABLE "license_redemption_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reseller_id" uuid NOT NULL,
	"redeem_code" text NOT NULL,
	"redeem_code_hash" text NOT NULL,
	"status" smallint NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"redeem_expires_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"claimed_by_organization_id" uuid,
	"claimed_by_user_id" uuid,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "license_redemption_codes_redeem_code_hash_unique" UNIQUE("redeem_code_hash")
);
--> statement-breakpoint
CREATE TABLE "license_redemption_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"redemption_id" uuid NOT NULL,
	"license_id" uuid NOT NULL,
	"pricing_id" uuid,
	"base_price" numeric(10, 2) NOT NULL,
	"sold_price" numeric(10, 2) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"duration_days" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "license_redemption_items_license_id_unique" UNIQUE("license_id")
);
--> statement-breakpoint
ALTER TABLE "license_redemption_codes" ADD CONSTRAINT "license_redemption_codes_reseller_id_users_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_redemption_codes" ADD CONSTRAINT "license_redemption_codes_claimed_by_organization_id_organizations_id_fk" FOREIGN KEY ("claimed_by_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_redemption_codes" ADD CONSTRAINT "license_redemption_codes_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_redemption_codes" ADD CONSTRAINT "license_redemption_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_redemption_codes" ADD CONSTRAINT "license_redemption_codes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_redemption_items" ADD CONSTRAINT "license_redemption_items_redemption_id_license_redemption_codes_id_fk" FOREIGN KEY ("redemption_id") REFERENCES "public"."license_redemption_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_redemption_items" ADD CONSTRAINT "license_redemption_items_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_redemption_items" ADD CONSTRAINT "license_redemption_items_pricing_id_license_pricing_id_fk" FOREIGN KEY ("pricing_id") REFERENCES "public"."license_pricing"("id") ON DELETE no action ON UPDATE no action;
