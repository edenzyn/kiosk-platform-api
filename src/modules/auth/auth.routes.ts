import { Router } from "express";
import { container } from "../../config/container";
import type { AuthController } from "./auth.controller";
import asyncHandler from "express-async-handler";

const router = Router();
const authController = container.resolve<AuthController>("authController");

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/refresh", asyncHandler(authController.refresh));
router.post("/logout", asyncHandler(authController.logout));

export default router;
