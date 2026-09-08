import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { MarketService } from "./market.service";
import { MarketValidator } from "./market.validator";

export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  getPlatformMarkets = async (req: Request, res: Response): Promise<void> => {
    const query = await MarketValidator.getPlatformMarketsQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );
    const result = await this.marketService.getPlatformMarkets({ query });
    res.json(result);
  };

  createMarket = async (req: Request, res: Response): Promise<void> => {
    const dto = await MarketValidator.createMarket.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const currentUser = req.user as UserTokenDto;
    const result = await this.marketService.createMarket({
      dto,
      currentUser,
    });
    res.status(HttpStatusCodes.CREATED).json(result);
  };

  updateMarket = async (req: Request, res: Response): Promise<void> => {
    const params = await MarketValidator.marketIdParam.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    const dto = await MarketValidator.updateMarket.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const currentUser = req.user as UserTokenDto;
    const result = await this.marketService.updateMarket({
      marketId: params.id,
      dto,
      currentUser,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  toggleMarketStatus = async (req: Request, res: Response): Promise<void> => {
    const params = await MarketValidator.marketIdParam.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    const currentUser = req.user as UserTokenDto;
    const result = await this.marketService.toggleMarketStatus({
      marketId: params.id,
      currentUser,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };
}
