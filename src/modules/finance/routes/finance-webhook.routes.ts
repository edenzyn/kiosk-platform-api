import { Router } from "express";
import asyncHandler from "express-async-handler";
import { container } from "../../../config/container";
import type { FinanceController } from "../finance.controller";

const financeWebhookRouter = Router();
const financeController =
  container.resolve<FinanceController>("financeController");

financeWebhookRouter.post(
  "/webhooks/rzrpay",
  asyncHandler(financeController.razorpayWebhook),
);

export { financeWebhookRouter };
