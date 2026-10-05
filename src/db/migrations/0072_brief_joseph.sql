CREATE TABLE "business_day_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_day_id" uuid NOT NULL,
	"action" smallint NOT NULL,
	"trigger" smallint NOT NULL,
	"performed_by" uuid,
	"device_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"status" smallint DEFAULT 1 NOT NULL,
	"last_token_number" integer DEFAULT 0 NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opened_by" uuid,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_day_cutoff_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "business_day_cutoff_logs" CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "business_day_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "business_day_logs" ADD CONSTRAINT "business_day_logs_business_day_id_business_days_id_fk" FOREIGN KEY ("business_day_id") REFERENCES "public"."business_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_day_logs" ADD CONSTRAINT "business_day_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_day_logs" ADD CONSTRAINT "business_day_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_days" ADD CONSTRAINT "business_days_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_days" ADD CONSTRAINT "business_days_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_days" ADD CONSTRAINT "business_days_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_days" ADD CONSTRAINT "business_days_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_day_logs_day_created_at_idx" ON "business_day_logs" USING btree ("business_day_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_days_branch_date_idx" ON "business_days" USING btree ("branch_id","business_date");--> statement-breakpoint
CREATE UNIQUE INDEX "business_days_branch_open_idx" ON "business_days" USING btree ("branch_id") WHERE "business_days"."status" = 1;--> statement-breakpoint
CREATE INDEX "business_days_status_idx" ON "business_days" USING btree ("status");--> statement-breakpoint
CREATE INDEX "business_days_organization_date_idx" ON "business_days" USING btree ("organization_id","business_date");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_day_id_business_days_id_fk" FOREIGN KEY ("business_day_id") REFERENCES "public"."business_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_business_day_status_idx" ON "orders" USING btree ("business_day_id","order_status");--> statement-breakpoint
CREATE INDEX "orders_business_day_token_idx" ON "orders" USING btree ("business_day_id","token_number");