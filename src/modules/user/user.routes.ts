import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import { accessMiddleware } from "../../middleware/access.middleware";
import {
  BRANCH_USER_READ_MANAGE_PERMISSIONS,
  ORGANIZATION_USER_READ_MANAGE_PERMS,
} from "../../shared/constants/user-permission.constants";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import type { UserController } from "./user.controller";

const router = Router();
const userController = container.resolve<UserController>("userController");

router.get("/e", asyncHandler(userController.checkAuth));
router.get(
  "/",
  accessMiddleware({
    organization: ORGANIZATION_USER_READ_MANAGE_PERMS,
    branch: BRANCH_USER_READ_MANAGE_PERMISSIONS,
  }),
  asyncHandler(userController.getUsersByTenantAndScope),
);
router.post(
  "/invite",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_USER_INVITE],
    branch: [UserPermissions.BRANCH_USER_INVITE],
  }),
  asyncHandler(userController.inviteUser),
);

router.get(
  "/invitations",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_USER_INVITE],
    branch: [UserPermissions.BRANCH_USER_INVITE],
  }),
  asyncHandler(userController.getInvitationsByTenant),
);

router.post(
  "/invitations/:id/revoke",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_USER_INVITE],
    branch: [UserPermissions.BRANCH_USER_INVITE],
  }),
  asyncHandler(userController.revokeInvitation),
);

router.post(
  "/invitations/:id/resend",
  accessMiddleware({
    organization: [UserPermissions.ORGANIZATION_USER_INVITE],
    branch: [UserPermissions.BRANCH_USER_INVITE],
  }),
  asyncHandler(userController.resendInvitation),
);

export default router;
