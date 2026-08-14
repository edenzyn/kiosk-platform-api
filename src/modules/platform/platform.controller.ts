import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { AppError } from "../../shared/errors/app-error";
import type { PlatformService } from "./platform.service";

export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  checkAuth = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError("Unauthorized", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const result = await this.platformService.checkPlatformUserAuth({
      tokenUser: req.user,
    });

    res.json(result);
  };
}
