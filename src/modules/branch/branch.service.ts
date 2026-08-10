import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { DEFAULT_BRANCH_ROLES } from "../../shared/constants/user-role.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
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

    const allKeys = Array.from(
      new Set(DEFAULT_BRANCH_ROLES.flatMap((role) => role.permissions)),
    );

    const dbPermissions =
      await this.rbacRepository.getPermissionsByKeys(allKeys);
    const keyToIdMap = new Map(dbPermissions.map((p) => [p.key, p.id]));

    for (const defaultRole of DEFAULT_BRANCH_ROLES) {
      const role = await this.rbacRepository.createRole({
        organizationId: branch.organizationId,
        branchId: branch.id,
        name: defaultRole.name,
        description: `Default branch ${defaultRole.name.toLowerCase()} role`,
        rank: defaultRole.rank,
        isSystem: defaultRole.isSystem ?? false,
        createdBy: user.id,
      });

      const permissionMappers = defaultRole.permissions
        .map((pKey) => {
          const permissionId = keyToIdMap.get(pKey);
          if (!permissionId) return null;
          return {
            entityType: PermissionEntityType.ROLE,
            entityId: role.id,
            permissionId,
            organizationId: branch.organizationId,
            branchId: branch.id,
            isActive: true,
            createdBy: user.id,
          };
        })
        .filter((pm): pm is NonNullable<typeof pm> => pm !== null);

      await this.rbacRepository.bulkInsertPermissionMappers(permissionMappers);
    }
    return branch;
  }

  async getBranches(
    effectiveTenant: EffectiveTenant,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
      sortBy?: string;
      sortOrder?: SortingOrderEnum;
    } = {},
  ) {
    const orgIdFilter = effectiveTenant.organizationId;
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    let branchIdsFilter: string[] | undefined = undefined;
    if (effectiveTenant.branchId) {
      branchIdsFilter = [effectiveTenant.branchId];
    }

    const { branches, total } = await this.branchRepository.getBranches(
      orgIdFilter,
      branchIdsFilter,
      page,
      limit,
      filters.search,
      filters.isActive,
      filters.sortBy,
      filters.sortOrder,
    );

    return {
      branches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBranchesForFilters(effectiveTenant: EffectiveTenant) {
    const orgIdFilter = effectiveTenant.organizationId;

    let branchIdsFilter: string[] | undefined = undefined;
    if (effectiveTenant.branchId) {
      branchIdsFilter = [effectiveTenant.branchId];
    }

    return this.branchRepository.getBranchesForFilters(
      orgIdFilter,
      branchIdsFilter,
    );
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
