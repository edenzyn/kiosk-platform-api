CREATE TABLE "tenant_tax_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tax_profile_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"condition_type" smallint DEFAULT 1 NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "tenant_tax_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_tax_inclusive" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "tenant_tax_components" ADD CONSTRAINT "tenant_tax_components_tax_profile_id_tenant_tax_profiles_id_fk" FOREIGN KEY ("tax_profile_id") REFERENCES "public"."tenant_tax_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_tax_components" ADD CONSTRAINT "tenant_tax_components_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_tax_components" ADD CONSTRAINT "tenant_tax_components_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_tax_profiles" ADD CONSTRAINT "tenant_tax_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_tax_profiles" ADD CONSTRAINT "tenant_tax_profiles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_tax_profiles" ADD CONSTRAINT "tenant_tax_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_tax_profiles" ADD CONSTRAINT "tenant_tax_profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_tax_components_profile_idx" ON "tenant_tax_components" USING btree ("tax_profile_id");--> statement-breakpoint
CREATE INDEX "tenant_tax_profiles_tenant_idx" ON "tenant_tax_profiles" USING btree ("organization_id","branch_id");