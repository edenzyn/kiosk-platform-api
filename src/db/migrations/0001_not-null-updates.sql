ALTER TABLE "permissions" ALTER COLUMN "key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions_mapper" ALTER COLUMN "entity_id" SET NOT NULL;