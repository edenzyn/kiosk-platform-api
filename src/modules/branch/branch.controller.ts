import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { BranchService } from "./branch.service";
import { BranchValidator } from "./branch.validator";
import type { CreateBranchRequestDto } from "./dtos/create-branch.dtos";

export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await BranchValidator.create.validate(
      { ...req.body, ...req.effectiveTenant },
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const branch = await this.branchService.createBranch(
      data as CreateBranchRequestDto,
      req.user as UserTokenDto,
      req.effectiveTenant as EffectiveTenant,
    );
    res.status(HttpStatusCodes.CREATED).json({ branch });
  };

  getBranches = async (req: Request, res: Response): Promise<void> => {
    const queryDto = await BranchValidator.getBranchesQuery.validate(
      req.query,
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );
    const result = await this.branchService.getBranches(
      req.effectiveTenant as EffectiveTenant,
      queryDto,
    );
    res.status(HttpStatusCodes.OK).json(result);
  };

  getBranchesForFilters = async (req: Request, res: Response): Promise<void> => {
    const result = await this.branchService.getBranchesForFilters(
      req.effectiveTenant as EffectiveTenant,
    );
    res.status(HttpStatusCodes.OK).json(result);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const data = await BranchValidator.update.validate(
      { ...req.body, id: req.params.id },
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const branch = await this.branchService.updateBranch(
      data,
      req.user as UserTokenDto,
      req.effectiveTenant as EffectiveTenant,
    );
    res.status(HttpStatusCodes.OK).json({ branch });
  };

  getDetails = async (req: Request, res: Response): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const result = await this.branchService.getBranchDetails({
      branchId: effectiveTenant.branchId as string,
      effectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  updateDetails = async (req: Request, res: Response): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const data = await BranchValidator.updateDetails.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.branchService.updateBranchDetails({
      branchId: effectiveTenant.branchId as string,
      data,
      user: req.user as UserTokenDto,
      effectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  getSettings = async (req: Request, res: Response): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const result = await this.branchService.getBranchSettings({
      branchId: effectiveTenant.branchId as string,
      effectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };

  updateSettings = async (req: Request, res: Response): Promise<void> => {
    const effectiveTenant = req.effectiveTenant as EffectiveTenant;
    const data = await BranchValidator.updateSettings.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.branchService.updateBranchSettings({
      branchId: effectiveTenant.branchId as string,
      data,
      effectiveTenant,
    });
    res.status(HttpStatusCodes.OK).json(result);
  };
}
