import type { Request, Response } from "express";
import type { BranchService } from "./branch.service";
import { BranchValidator } from "./branch.validator";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
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
    );
    res.status(HttpStatusCodes.CREATED).json({ branch });
  };
  list = async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.query.organizationId as string | undefined;
    const branches = await this.branchService.listBranches(
      organizationId,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.OK).json({ branches });
  };
}
