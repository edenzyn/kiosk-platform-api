import type { Request, Response } from "express";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { UnauthorizedError } from "../../shared/errors/unauthorized-error";
import type { PlatformService } from "./platform.service";

export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  checkAuth = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError("Unauthorized", {
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const result = await this.platformService.checkPlatformUserAuth({
      tokenUser: req.user,
    });

    res.json(result);
  };
}
