import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { AppError } from "../../shared/errors/app-error";
import type { RbacRepository } from "../rbac/rbac.repository";
import type { BranchRepository } from "./branch.repository";
import type { CreateBranchRequestDto } from "./dtos/create-branch-request.dto";
import type { UpdateBranchRequestDto } from "./dtos/update-branch-request.dto";

export class BranchService {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly rbacRepository: RbacRepository,
  ) {}

  async createBranch(
    data: Omit<CreateBranchRequestDto, "createdBy">,
    user: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ) {
    if (effectiveTenant.organizationId !== user.organizationId) {
      throw new AppError("Cannot create branch for a different organization", {
        statusCode: HttpStatusCodes.FORBIDDEN,
      });
    }

    const branch = await this.branchRepository.create({
      ...data,
      createdBy: user.id,
    });

    await this.rbacRepository.createDefaultBranchRoles(
      branch.id,
      branch.organizationId,
      user.id,
    );

    return branch;
  }

  async getBranches(
    effectiveTenant: EffectiveTenant,
    page: number = 1,
    limit: number = 10,
  ) {
    const orgIdFilter = effectiveTenant.organizationId;

    let branchIdsFilter: string[] | undefined = undefined;
    if (effectiveTenant.branchId) {
      branchIdsFilter = [effectiveTenant.branchId];
    }

    const { branches, total } = await this.branchRepository.getBranches(
      orgIdFilter,
      branchIdsFilter,
      page,
      limit,
    );

    return {
      branches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateBranch(
    data: UpdateBranchRequestDto,
    user: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ) {
    const { id, ...updateData } = data;
    const existing = await this.branchRepository.findById(id);
    if (!existing) {
      throw new AppError("Branch not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    if (existing.organizationId !== effectiveTenant.organizationId) {
      throw new AppError("Cannot update branch for a different organization", {
        statusCode: HttpStatusCodes.FORBIDDEN,
      });
    }

    const updated = await this.branchRepository.update(id, {
      ...updateData,
      updatedBy: user.id,
    });

    return updated;
  }
}
