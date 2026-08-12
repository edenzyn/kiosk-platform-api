import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserService } from "./user.service";
import { UserValidator } from "./user.validator";

export class UserController {
  constructor(private readonly userService: UserService) {}

  checkAuth = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const result = await this.userService.checkAuth(userTokenData);
    res.json(result);
  };

  getUsersByTenantAndScope = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const queryDto = await UserValidator.getUsersQuery.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.getUsersByTenantAndScope(
      queryDto,
      effectiveTenant,
    );
    res.json(result);
  };

  inviteUser = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const data = await UserValidator.inviteUser.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.inviteUser(
      data,
      userTokenData,
      effectiveTenant,
    );
    res.status(HttpStatusCodes.CREATED).json(result);
  };

  getInvitationsByTenant = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const queryDto = await UserValidator.getInvitationsQuery.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.getInvitationsByTenant({
      effectiveTenant,
      query: queryDto,
    });
    res.json(result);
  };

  revokeInvitation = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const data = await UserValidator.revokeInvitation.validate(
      { id: req.params.id },
      { abortEarly: false, stripUnknown: true },
    );
    const result = await this.userService.revokeInvitation(
      data.id,
      userTokenData,
      effectiveTenant,
    );
    res.json(result);
  };

  resendInvitation = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const data = await UserValidator.resendInvitation.validate(
      { id: req.params.id },
      { abortEarly: false, stripUnknown: true },
    );
    const result = await this.userService.resendInvitation(
      data.id,
      userTokenData,
      effectiveTenant,
    );
    res.json(result);
  };
}
