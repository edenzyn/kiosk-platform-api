import { Router } from "express";
import { container } from "../../config/container";
import type { UserController } from "./user.controller";
import asyncHandler from "express-async-handler";

const router = Router();
const userController = container.resolve<UserController>("userController");

router.get("/me", asyncHandler(userController.checkAuth));

export default router;
