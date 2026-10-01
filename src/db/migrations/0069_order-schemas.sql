CREATE TABLE "order_item_modifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"item_modifier_id" uuid,
	"item_modifier_option_id" uuid,
	"modifier_name" varchar(100) NOT NULL,
	"option_name" varchar(100) NOT NULL,
	"option_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"menu_category_id" uuid,
	"item_name" varchar(150) NOT NULL,
	"item_code" varchar(100),
	"category_name" varchar(100),
	"image" varchar(255),
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"modifiers_unit_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"takeaway_charge_unit_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"line_subtotal" numeric(10, 2) NOT NULL,
	"takeaway_charge_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(10, 2) NOT NULL,
	"notes" text,
	"item_status" smallint DEFAULT 1 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"device_id" uuid,
	"payment_method" smallint NOT NULL,
	"tenant_payment_config_id" uuid,
	"payment_provider_id" uuid,
	"provider_slug" varchar(50),
	"terminal_id" varchar(100),
	"amount" numeric(10, 2) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"payment_status" smallint DEFAULT 1 NOT NULL,
	"merchant_transaction_id" varchar(100) NOT NULL,
	"provider_transaction_id" varchar(255),
	"provider_status" varchar(50),
	"qr_payload" text,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"failure_reason" text,
	"initiated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"collected_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"order_item_id" uuid,
	"from_status" smallint,
	"to_status" smallint NOT NULL,
	"changed_by_device_id" uuid,
	"changed_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_taxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"tax_component_id" uuid,
	"tax_name" varchar(100) NOT NULL,
	"tax_rate" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"device_id" uuid,
	"order_number" varchar(30) NOT NULL,
	"token_number" integer NOT NULL,
	"idempotency_key" varchar(100) NOT NULL,
	"order_source" smallint NOT NULL,
	"order_type" smallint NOT NULL,
	"order_status" smallint DEFAULT 1 NOT NULL,
	"payment_status" smallint DEFAULT 1 NOT NULL,
	"payment_method" smallint,
	"currency_code" varchar(3) NOT NULL,
	"subtotal_amount" numeric(10, 2) NOT NULL,
	"takeaway_charge_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"amount_before_tax" numeric(10, 2) NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_tax_inclusive" boolean DEFAULT false NOT NULL,
	"tax_profile_id" uuid,
	"total_amount" numeric(10, 2) NOT NULL,
	"customer_name" varchar(100),
	"customer_phone" varchar(30),
	"notes" text,
	"placed_at" timestamp with time zone,
	"preparing_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_item_modifier_id_item_modifiers_id_fk" FOREIGN KEY ("item_modifier_id") REFERENCES "public"."item_modifiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_item_modifier_option_id_item_modifier_options_id_fk" FOREIGN KEY ("item_modifier_option_id") REFERENCES "public"."item_modifier_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_category_id_menu_categories_id_fk" FOREIGN KEY ("menu_category_id") REFERENCES "public"."menu_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_tenant_payment_config_id_tenant_payment_configs_id_fk" FOREIGN KEY ("tenant_payment_config_id") REFERENCES "public"."tenant_payment_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_payment_provider_id_payment_providers_id_fk" FOREIGN KEY ("payment_provider_id") REFERENCES "public"."payment_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_collected_by_users_id_fk" FOREIGN KEY ("collected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_logs" ADD CONSTRAINT "order_status_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_logs" ADD CONSTRAINT "order_status_logs_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_logs" ADD CONSTRAINT "order_status_logs_changed_by_device_id_devices_id_fk" FOREIGN KEY ("changed_by_device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_logs" ADD CONSTRAINT "order_status_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_taxes" ADD CONSTRAINT "order_taxes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_taxes" ADD CONSTRAINT "order_taxes_tax_component_id_tenant_tax_components_id_fk" FOREIGN KEY ("tax_component_id") REFERENCES "public"."tenant_tax_components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tax_profile_id_tenant_tax_profiles_id_fk" FOREIGN KEY ("tax_profile_id") REFERENCES "public"."tenant_tax_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_item_modifiers_order_item_idx" ON "order_item_modifiers" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_menu_item_idx" ON "order_items" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "order_payments_order_idx" ON "order_payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_payments_merchant_transaction_id_idx" ON "order_payments" USING btree ("merchant_transaction_id");--> statement-breakpoint
CREATE INDEX "order_payments_provider_transaction_idx" ON "order_payments" USING btree ("payment_provider_id","provider_transaction_id");--> statement-breakpoint
CREATE INDEX "order_payments_branch_status_idx" ON "order_payments" USING btree ("branch_id","payment_status");--> statement-breakpoint
CREATE INDEX "order_payments_status_expires_at_idx" ON "order_payments" USING btree ("payment_status","expires_at");--> statement-breakpoint
CREATE INDEX "order_status_logs_order_created_at_idx" ON "order_status_logs" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_taxes_order_idx" ON "order_taxes" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_branch_order_number_idx" ON "orders" USING btree ("branch_id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_device_idempotency_key_idx" ON "orders" USING btree ("device_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "orders_branch_created_at_idx" ON "orders" USING btree ("branch_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_branch_status_idx" ON "orders" USING btree ("branch_id","order_status");--> statement-breakpoint
CREATE INDEX "orders_organization_created_at_idx" ON "orders" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_expires_at_idx" ON "orders" USING btree ("order_status","expires_at");