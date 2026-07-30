import type { Request, Response } from "express";
import type { UserService } from "./user.service";
import { UserTokenDto } from "../../shared/dtos/user-token.dto";

export class UserController {
  constructor(private readonly userService: UserService) {}

  checkAuth = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const result = await this.userService.checkAuth(userTokenData);
    res.json(result);
  };

  getUsers = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const result = await this.userService.getUsers(userTokenData);
    res.json(result);
  };
}
