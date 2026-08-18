import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { ResellerService } from "./reseller.service";
import { ResellerValidator } from "./reseller.validator";

export class ResellerController {
  constructor(private readonly resellerService: ResellerService) {}

  inviteReseller = async (req: Request, res: Response): Promise<void> => {
    const currentUser = req.user as UserTokenDto;
    const dto = await ResellerValidator.inviteReseller.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.resellerService.inviteReseller({
      dto,
      currentUser,
    });
    res.status(HttpStatusCodes.CREATED).json(result);
  };

  getInvitations = async (req: Request, res: Response): Promise<void> => {
    const query = await ResellerValidator.getInvitationsQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );
    const result = await this.resellerService.getResellerInvitations({
      query,
    });
    res.json(result);
  };
}
