import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import type { PaymentController } from "../controllers/payment.controller";

const financeWebhookRouter = Router();
const paymentController =
  container.resolve<PaymentController>("paymentController");

financeWebhookRouter.post(
  "/webhooks/rzrpay",
  asyncHandler(paymentController.razorpayWebhook),
);

export { financeWebhookRouter };
