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

  updateSettings = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const data = await UserValidator.updateSettings.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.updateMySettings(
      userTokenData.id,
      data,
    );
    res.json(result);
  };

  listSessions = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const result = await this.userService.listMySessions(
      userTokenData.id,
      userTokenData.sessionId,
    );
    res.json(result);
  };

  revokeSession = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const params = await UserValidator.sessionIdParam.validate(
      { sessionId: req.params.sessionId },
      { abortEarly: false, stripUnknown: true },
    );
    const revoked = await this.userService.revokeMySession(
      userTokenData.id,
      params.sessionId,
    );
    res.json({ revoked });
  };

  revokeOtherSessions = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    if (!userTokenData.sessionId) {
      res.json({ revokedCount: 0 });
      return;
    }
    const revokedCount = await this.userService.revokeMyOtherSessions(
      userTokenData.id,
      userTokenData.sessionId,
    );
    res.json({ revokedCount });
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const data = await UserValidator.changePassword.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.changePassword(
      userTokenData.id,
      data,
    );
    res.json(result);
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const data = await UserValidator.updateProfile.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.updateProfile(
      userTokenData.id,
      data,
    );
    res.json(result);
  };

  requestEmailChange = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const data = await UserValidator.requestEmailChange.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.requestEmailChange(
      userTokenData.id,
      data.newEmail,
    );
    res.json(result);
  };

  confirmEmailChange = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const data = await UserValidator.confirmContactChange.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.confirmEmailChange(
      userTokenData.id,
      data.changeToken,
      data.code,
    );
    res.json(result);
  };

  requestMobileChange = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const data = await UserValidator.requestMobileChange.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.requestMobileChange(
      userTokenData.id,
      data.newMobile,
    );
    res.json(result);
  };

  confirmMobileChange = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const data = await UserValidator.confirmContactChange.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.confirmMobileChange(
      userTokenData.id,
      data.changeToken,
      data.code,
    );
    res.json(result);
  };

  getMyTwoFactorStatus = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const result = await this.userService.getTwoFactorStatus(userTokenData.id);
    res.json(result);
  };

  setupTwoFactor = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const data = await UserValidator.setupTwoFactor.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.setupTwoFactor(
      userTokenData.id,
      data.method,
    );
    res.json(result);
  };

  enableTwoFactor = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const data = await UserValidator.enableTwoFactor.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.enableTwoFactor(
      userTokenData.id,
      data.otpToken,
      data.code,
    );
    res.json(result);
  };

  disableTwoFactor = async (req: Request, res: Response): Promise<void> => {
    const userTokenData = req.user as UserTokenDto;
    const data = await UserValidator.disableTwoFactor.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.userService.disableTwoFactor(
      userTokenData.id,
      data.password,
    );
    res.json(result);
  };
}
