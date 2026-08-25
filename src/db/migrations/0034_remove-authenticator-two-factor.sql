-- Removes the authenticator (TOTP) two-factor method.
--
-- Users currently enrolled on AUTHENTICATOR (two_factor_method = 3) have their
-- 2FA switched off, otherwise they would be left enabled against a method the
-- application no longer implements and would be unable to complete login.
-- They can re-enable 2FA over email or WhatsApp.
UPDATE "user_settings"
SET "two_factor_enabled" = false,
    "two_factor_method" = NULL
WHERE "two_factor_method" = 3;
--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "two_factor_secret";
--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "two_factor_backup_code_hashes";
