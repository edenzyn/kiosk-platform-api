import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { GetUsersRequestDto } from "./dtos/get-users-request.dto";
import type { UserService } from "./user.service";
import { UserValidator } from "./user.validator";

export class UserController {
  constructor(private readonly userService: UserService) {}

  checkAuth = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const result = await this.userService.checkAuth(userTokenData);
    res.json(result);
  };

  getUsersByTenant = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const queryDto: GetUsersRequestDto = {
      search: req.query.search as string | undefined,
    };
    const result = await this.userService.getUsersByTenant(
      queryDto,
      userTokenData,
    );
    res.json(result);
  };

  inviteUser = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const data = await UserValidator.inviteUser.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.inviteUser(data, userTokenData);
    res.status(HttpStatusCodes.CREATED).json(result);
  };
}
