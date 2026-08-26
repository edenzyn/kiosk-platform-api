import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../constants/http-status-codes.constants";
import { ErrorCodes } from "../../enums/core/error-codes.enum";
import { AppError } from "../../errors/app-error";

export interface FrankfurterLatestRatesResult {
  base: string;
  rateDate: string;
  rates: Record<string, number>;
}

interface FrankfurterRateRecord {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

export class FrankfurterProvider {
  async getLatestRates(
    baseCurrency: string,
  ): Promise<FrankfurterLatestRatesResult> {
    const url = `${env.FRANKFURTER_API_BASE_URL}/rates?base=${encodeURIComponent(baseCurrency)}`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new AppError("Failed to get exchange rates", {
        statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
        code: ErrorCodes.EXCHANGE_RATE_UNAVAILABLE,
        details: error,
      });
    }

    if (!response.ok) {
      throw new AppError(`Failed to get exchange rates`, {
        statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
        code: ErrorCodes.EXCHANGE_RATE_UNAVAILABLE,
      });
    }

    const records = (await response.json()) as FrankfurterRateRecord[];

    if (records.length === 0) {
      throw new AppError("Failed to get exchange rates", {
        statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
        code: ErrorCodes.EXCHANGE_RATE_UNAVAILABLE,
      });
    }

    const rates: Record<string, number> = {};
    let rateDate = records[0]!.date;

    for (const record of records) {
      rates[record.quote] = record.rate;
      if (record.date > rateDate) rateDate = record.date;
    }

    return { base: baseCurrency, rateDate, rates };
  }
}
