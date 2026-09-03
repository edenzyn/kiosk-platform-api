import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
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

  getMyOrganization = async (req: Request, res: Response): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const result = await this.organizationService.getMyOrganization(
      effectiveTenant.organizationId,
    );
    res.status(HttpStatusCodes.OK).json(result);
  };

  updateMyOrganization = async (req: Request, res: Response): Promise<void> => {
    const currentUser = req.user as UserTokenDto;
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const data = await OrganizationValidator.updateMyOrganization.validate(
      req.body,
      { abortEarly: false, stripUnknown: true },
    );
    const result = await this.organizationService.updateMyOrganization({
      organizationId: effectiveTenant.organizationId,
      data,
      currentUser,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getMyOrganizationSettings = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const result = await this.organizationService.getMyOrganizationSettings(
      effectiveTenant.organizationId,
    );
    res.status(HttpStatusCodes.OK).json(result);
  };

  updateMyOrganizationSettings = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const data =
      await OrganizationValidator.updateMyOrganizationSettings.validate(
        req.body,
        { abortEarly: false, stripUnknown: true },
      );
    const result = await this.organizationService.updateMyOrganizationSettings(
      {
        organizationId: effectiveTenant.organizationId,
        data,
      },
    );
    res.status(HttpStatusCodes.OK).json(result);
  };

  uploadBrandLogo = async (req: Request, res: Response): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;

    const result = await this.organizationService.uploadBrandLogo({
      organizationId: effectiveTenant.organizationId,
      contentType: req.headers["content-type"],
      body: req.body,
    });

    res.status(HttpStatusCodes.OK).json(result);
  };

  getBrandLogoUrl = async (req: Request, res: Response): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;

    const result = await this.organizationService.getBrandLogoUrl(
      effectiveTenant.organizationId,
    );

    res.status(HttpStatusCodes.OK).json(result);
  };

  deleteBrandLogo = async (req: Request, res: Response): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;

    await this.organizationService.deleteBrandLogo(
      effectiveTenant.organizationId,
    );

    res.status(HttpStatusCodes.NO_CONTENT).send();
  };
}
