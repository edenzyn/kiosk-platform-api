import { Router } from "express";
import { container } from "../../config/container";
import type { UserController } from "./user.controller";
import asyncHandler from "express-async-handler";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();
const userController = container.resolve<UserController>("userController");

router.get("/me", authMiddleware, asyncHandler(userController.checkAuth));

export default router;
