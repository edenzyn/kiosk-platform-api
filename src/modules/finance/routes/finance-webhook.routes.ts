import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import type { PaymentProviderController } from "../controllers/payment-provider.controller";

const financeWebhookRouter = Router();
const paymentProviderController =
  container.resolve<PaymentProviderController>("paymentProviderController");

financeWebhookRouter.post(
  "/webhooks/rzrpay",
  asyncHandler(paymentProviderController.razorpayWebhook),
);

export { financeWebhookRouter };
