no neeCREATE TABLE "staff_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"business_day_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"device_type" smallint NOT NULL,
	"user_id" uuid NOT NULL,
	"status" smallint DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"end_type" smallint,
	"ended_by" uuid,
	"note" text,
	"currency_code" varchar(3),
	"opening_cash" numeric(10, 2),
	"start_verified_by" uuid,
	"start_verification_method" smallint,
	"end_verified_by" uuid,
	"end_verification_method" smallint,
	"cash_order_count" integer,
	"cash_amount" numeric(10, 2),
	"qr_order_count" integer,
	"qr_amount" numeric(10, 2),
	"card_order_count" integer,
	"card_amount" numeric(10, 2),
	"cancelled_order_count" integer,
	"cancelled_amount" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_payments" ADD COLUMN "shift_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shift_id" uuid;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_business_day_id_business_days_id_fk" FOREIGN KEY ("business_day_id") REFERENCES "public"."business_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_ended_by_users_id_fk" FOREIGN KEY ("ended_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_start_verified_by_users_id_fk" FOREIGN KEY ("start_verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_end_verified_by_users_id_fk" FOREIGN KEY ("end_verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_shifts_device_open_idx" ON "staff_shifts" USING btree ("device_id") WHERE "staff_shifts"."status" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_shifts_user_open_idx" ON "staff_shifts" USING btree ("user_id") WHERE "staff_shifts"."status" = 1;--> statement-breakpoint
CREATE INDEX "staff_shifts_business_day_status_idx" ON "staff_shifts" USING btree ("business_day_id","status");--> statement-breakpoint
CREATE INDEX "staff_shifts_branch_started_at_idx" ON "staff_shifts" USING btree ("branch_id","started_at");--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_shift_id_staff_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."staff_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shift_id_staff_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."staff_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_payments_shift_idx" ON "order_payments" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "orders_shift_idx" ON "orders" USING btree ("shift_id");
