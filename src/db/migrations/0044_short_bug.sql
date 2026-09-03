CREATE TABLE "branch_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"logo_url" varchar(500),
	"theme_mode" varchar(20) DEFAULT 'system' NOT NULL,
	"primary_color" varchar(20) DEFAULT '#10b981' NOT NULL,
	"language_code" varchar(10) DEFAULT 'en' NOT NULL,
	"currency_code" varchar(3) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_settings_branch_id_unique" UNIQUE("branch_id")
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"logo_url" varchar(500),
	"theme_mode" varchar(20) DEFAULT 'system' NOT NULL,
	"primary_color" varchar(20) DEFAULT '#10b981' NOT NULL,
	"language_code" varchar(10) DEFAULT 'en' NOT NULL,
	"currency_code" varchar(3) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "branch_settings" ADD CONSTRAINT "branch_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;