import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { OrganizationService } from "./organization.service";
import { OrganizationValidator } from "./organization.validator";

export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  invite = async (req: Request, res: Response): Promise<void> => {
    const currentUser = req.user as UserTokenDto;
    const dto = await OrganizationValidator.invite.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const result = await this.organizationService.inviteOrganization({
      dto,
      currentUser,
    });
    res.status(HttpStatusCodes.CREATED).json(result);
  };

  getOrganizations = async (req: Request, res: Response): Promise<void> => {
    const query = await OrganizationValidator.getOrganizationsQuery.validate(
      req.query,
      { abortEarly: false, stripUnknown: true },
    );
    const result = await this.organizationService.getOrganizations({ query });
    res.json(result);
  };

  toggleOrganizationStatus = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const params = await OrganizationValidator.organizationIdParam.validate(
      req.params,
      { abortEarly: false, stripUnknown: true },
    );
    const currentUser = req.user as UserTokenDto;
    const result = await this.organizationService.toggleOrganizationStatus({
      organizationId: params.id,
      currentUser,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };
}
