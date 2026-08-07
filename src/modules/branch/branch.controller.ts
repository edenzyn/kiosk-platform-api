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
    const data = await BranchValidator.create.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const branch = await this.branchService.createBranch(
      data as Omit<CreateBranchRequestDto, "createdBy">,
      req.user as UserTokenDto,
      req.effectiveTenant as EffectiveTenant,
    );
    res.status(HttpStatusCodes.CREATED).json({ branch });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const branches = await this.branchService.listBranches(
      req.effectiveTenant as EffectiveTenant,
    );
    res.status(HttpStatusCodes.OK).json({ branches });
  };
}
