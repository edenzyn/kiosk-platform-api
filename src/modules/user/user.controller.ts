import type { Request, Response } from "express";
import type { UserService } from "./user.service";
import { AppError } from "../../shared/errors/app-error";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";

export class UserController {
  constructor(private readonly userService: UserService) {}

  checkAuth = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError("Authentication required", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }
    const result = await this.userService.checkAuth(req.user);
    res.json(result);
  };
}
