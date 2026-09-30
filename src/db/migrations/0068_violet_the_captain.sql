CREATE TABLE "business_day_cutoff_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"cutoff_time" time NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "branch_settings" ADD COLUMN "business_day_cutoff_time" time;--> statement-breakpoint
ALTER TABLE "business_day_cutoff_logs" ADD CONSTRAINT "business_day_cutoff_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_day_cutoff_logs" ADD CONSTRAINT "business_day_cutoff_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_day_cutoff_logs" ADD CONSTRAINT "business_day_cutoff_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_day_cutoff_logs_branch_effective_idx" ON "business_day_cutoff_logs" USING btree ("branch_id","effective_from");--> statement-breakpoint
CREATE INDEX "business_day_cutoff_logs_organization_idx" ON "business_day_cutoff_logs" USING btree ("organization_id");