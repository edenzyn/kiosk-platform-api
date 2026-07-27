import { Router } from "express";
import { container } from "../../config/container";
import type { AuthController } from "./auth.controller";

const router = Router();
const authController = container.resolve<AuthController>("authController");

router.get("/status", authController.status);

export default router;
