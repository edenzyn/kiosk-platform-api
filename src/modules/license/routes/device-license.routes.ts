import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import type { LicenseController } from "../license.controller";

const deviceLicenseRouter = Router();
const licenseController =
  container.resolve<LicenseController>("licenseController");

deviceLicenseRouter.post(
  "/activate",
  asyncHandler(licenseController.activateLicense),
);

export { deviceLicenseRouter };
