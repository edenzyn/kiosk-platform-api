import { Router } from "express";

// Routes a reseller hits for themselves once logged in (e.g. their own
// redemption codes, inventory). Nothing here yet - platform-reseller.routes.ts
// is where a platform admin acts on resellers (invite, etc).
const resellerRouter = Router();

export { resellerRouter };
