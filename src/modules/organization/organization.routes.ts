import { Router } from "express";
import { container } from "../../config/container";
import type { OrganizationController } from "./organization.controller";
import asyncHandler from "express-async-handler";

const router = Router();
const organizationController = container.resolve<OrganizationController>(
  "organizationController",
);

router
  .route("/")
  .post(asyncHandler(organizationController.create))
  .get(asyncHandler(organizationController.list));

router
  .route("/:id")
  .get(asyncHandler(organizationController.getById))
  .patch(asyncHandler(organizationController.update))
  .delete(asyncHandler(organizationController.delete));

export default router;
