import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import type { AuthController } from "./auth.controller";

const router = Router();
const authController = container.resolve<AuthController>("authController");
// User routes
router.post("/login", asyncHandler(authController.loginUser));
router.post("/2fa/verify", asyncHandler(authController.verifyTwoFactor));
router.post("/accept-invite", asyncHandler(authController.acceptInvitation));
router.post(
  "/o/accept-invite",
  asyncHandler(authController.acceptOrganizationInvitation),
);
router.post("/forgot-password", asyncHandler(authController.forgotPassword));
router.post("/reset-password", asyncHandler(authController.resetPassword));
router.post("/refresh", asyncHandler(authController.refreshUserToken));
router.post("/logout", asyncHandler(authController.logoutUser));

// Platform routes
router.post("/p/login", asyncHandler(authController.loginPlatformUser));

// Reseller routes
router.post("/r/login", asyncHandler(authController.loginReseller));
router.post(
  "/r/accept-invite",
  asyncHandler(authController.acceptResellerInvitation),
);

// Device routes
router.post("/d/login", asyncHandler(authController.loginDevice));
router.post("/d/refresh", asyncHandler(authController.refreshDeviceToken));
router.post("/d/logout", asyncHandler(authController.logoutDevice));

export default router;
