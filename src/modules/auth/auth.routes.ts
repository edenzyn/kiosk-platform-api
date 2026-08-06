import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import type { AuthController } from "./auth.controller";

const router = Router();
const authController = container.resolve<AuthController>("authController");

router.post("/login", asyncHandler(authController.loginUser));
router.post("/refresh", asyncHandler(authController.refreshUserToken));
router.post("/logout", asyncHandler(authController.logoutUser));
router.post("/accept-invite", asyncHandler(authController.acceptInvitation));

export default router;
