ALTER TABLE "business_day_logs" DROP CONSTRAINT "business_day_logs_device_id_devices_id_fk";
--> statement-breakpoint
ALTER TABLE "business_day_logs" ALTER COLUMN "performed_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "business_days" ALTER COLUMN "opened_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "branch_settings" DROP COLUMN "business_day_cutoff_time";--> statement-breakpoint
ALTER TABLE "business_day_logs" DROP COLUMN "trigger";--> statement-breakpoint
ALTER TABLE "business_day_logs" DROP COLUMN "device_id";