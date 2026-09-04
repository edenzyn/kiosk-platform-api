import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { RazorpayProvider } from "../../shared/providers/finance/razorpay.provider";
import type { RazorpayWebhookPayload } from "./finance.types";
import type { FinanceService } from "./finance.service";

export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly razorpayProvider: RazorpayProvider,
  ) {}

  // ========================================
  // ? USER CLIENT APIS
  // ========================================
  getExchangeRates = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.financeService.getLatestRates();
    res.status(HttpStatusCodes.OK).json(result);
  };

  getSupportedCurrencies = async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    const result = await this.financeService.getSupportedCurrencies();
    res.status(HttpStatusCodes.OK).json(result);
  };

  // ========================================
  // ? WEBHOOKS
  // ========================================
  razorpayWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers["x-razorpay-signature"] as
      | string
      | undefined;

    if (!req.rawBody || !signature) {
      res.sendStatus(HttpStatusCodes.UNAUTHORIZED);
      return;
    }

    const isValid = this.razorpayProvider.verifyWebhookSignature(
      req.rawBody.toString(),
      signature,
    );
    if (!isValid) {
      res.sendStatus(HttpStatusCodes.UNAUTHORIZED);
      return;
    }

    await this.financeService.handleRazorpayWebhook({
      headers: req.headers,
      body: req.body as RazorpayWebhookPayload,
    });
    res.sendStatus(HttpStatusCodes.OK);
  };
}
