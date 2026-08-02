import { Router } from "express";
import { container } from "../../config/container";
import type { AuthController } from "./auth.controller";
import asyncHandler from "express-async-handler";

const router = Router();
const authController = container.resolve<AuthController>("authController");

router.post("/login", asyncHandler(authController.loginUser));
router.post("/refresh", asyncHandler(authController.refreshUserToken));
router.post("/logout", asyncHandler(authController.logoutUser));

export default router;
