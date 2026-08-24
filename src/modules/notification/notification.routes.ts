import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../config/container";
import type { NotificationController } from "./notification.controller";

const router = Router();
const notificationController = container.resolve<NotificationController>(
  "notificationController",
);

router.get(
  "/webhooks/whatsapp",
  asyncHandler(notificationController.verifyWebhook),
);
router.post(
  "/webhooks/whatsapp",
  asyncHandler(notificationController.receiveWebhook),
);

export default router;
