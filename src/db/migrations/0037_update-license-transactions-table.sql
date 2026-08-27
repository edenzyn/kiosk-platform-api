ALTER TABLE "license_transactions" DROP CONSTRAINT IF EXISTS "license_transactions_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "license_transactions" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "license_transactions" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_transactions" ADD CONSTRAINT "license_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "license_transactions" ADD CONSTRAINT "license_transactions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
