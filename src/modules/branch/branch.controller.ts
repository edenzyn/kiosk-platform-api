import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { BranchService } from "./branch.service";
import { BranchValidator } from "./branch.validator";
import type { CreateBranchRequestDto } from "./dtos/create-branch-request.dto";

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
      queryDto.page,
      queryDto.limit,
    );
    res.status(HttpStatusCodes.OK).json(result);
  };
}
