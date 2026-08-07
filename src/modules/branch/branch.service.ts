import type { BranchRepository } from "./branch.repository";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { CreateBranchRequestDto } from "./dtos/create-branch-request.dto";
import { AppError } from "../../shared/errors/app-error";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";


export class BranchService {
  constructor(private readonly branchRepository: BranchRepository) {}

  async createBranch(
    data: Omit<CreateBranchRequestDto, "createdBy">,
    user: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ) {
    if (effectiveTenant.organizationId !== data.organizationId) {
      throw new AppError("Cannot create branch for a different organization", {
        statusCode: HttpStatusCodes.FORBIDDEN,
      });
    }

    return this.branchRepository.create({
      ...data,
      createdBy: user.id,
    });
  }

  async listBranches(effectiveTenant: EffectiveTenant) {
    const orgIdFilter = effectiveTenant.organizationId;

    let branchIdsFilter: string[] | undefined = undefined;
    if (effectiveTenant.branchId) {
      branchIdsFilter = [effectiveTenant.branchId];
    }

    return this.branchRepository.findAll(orgIdFilter, branchIdsFilter);
  }
}
