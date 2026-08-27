import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { FinanceService } from "./finance.service";

export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ========================================
  // ? USER CLIENT APIS
  // ========================================
  getExchangeRates = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.financeService.getLatestRates();
    res.status(HttpStatusCodes.OK).json(result);
  };

  // ========================================
  // ? WEBHOOKS
  // ========================================
  razorpayWebhook = async (req: Request, res: Response): Promise<void> => {
    await this.financeService.handleRazorpayWebhook({
      headers: req.headers,
      body: req.body,
    });
    res.sendStatus(HttpStatusCodes.OK);
  };
}
