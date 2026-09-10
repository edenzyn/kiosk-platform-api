CREATE TABLE "app_tax_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tax_profile_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"condition_type" smallint NOT NULL,
	"rate" numeric(10, 4) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "app_tax_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_tax_inclusive" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "license_transaction_taxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"tax_profile_id" uuid,
	"tax_component_id" uuid,
	"tax_name" varchar(100) NOT NULL,
	"tax_rate" numeric(10, 4) NOT NULL,
	"tax_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "total_tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "billing_name" varchar(255);--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "billing_email" varchar(255);--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "billing_phone" varchar(30);--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "billing_address" text;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "billing_city" varchar(100);--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "billing_state" varchar(100);--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "billing_postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "billing_country" varchar(2);--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "billing_tax_id" varchar(50);--> statement-breakpoint
ALTER TABLE "markets" ADD COLUMN "app_tax_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "app_tax_components" ADD CONSTRAINT "app_tax_components_tax_profile_id_app_tax_profiles_id_fk" FOREIGN KEY ("tax_profile_id") REFERENCES "public"."app_tax_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_tax_components" ADD CONSTRAINT "app_tax_components_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_tax_components" ADD CONSTRAINT "app_tax_components_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_tax_profiles" ADD CONSTRAINT "app_tax_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_tax_profiles" ADD CONSTRAINT "app_tax_profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transaction_taxes" ADD CONSTRAINT "license_transaction_taxes_transaction_id_license_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."license_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transaction_taxes" ADD CONSTRAINT "license_transaction_taxes_tax_profile_id_app_tax_profiles_id_fk" FOREIGN KEY ("tax_profile_id") REFERENCES "public"."app_tax_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_transaction_taxes" ADD CONSTRAINT "license_transaction_taxes_tax_component_id_app_tax_components_id_fk" FOREIGN KEY ("tax_component_id") REFERENCES "public"."app_tax_components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "license_transaction_taxes_transaction_idx" ON "license_transaction_taxes" USING btree ("transaction_id");--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_app_tax_profile_id_app_tax_profiles_id_fk" FOREIGN KEY ("app_tax_profile_id") REFERENCES "public"."app_tax_profiles"("id") ON DELETE no action ON UPDATE no action;