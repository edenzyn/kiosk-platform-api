import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { DEFAULT_BRANCH_ROLES } from "../../shared/constants/user-role.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";
import { AppError } from "../../shared/errors/app-error";
import type { OrganizationRepository } from "../organization/organization.repository";
import type { RbacRepository } from "../rbac/rbac.repository";
import type { BranchRepository } from "./branch.repository";
import type { CreateBranchRequestDto } from "./dtos/create-branch.dtos";
import type { UpdateBranchRequestDto } from "./dtos/update-branch.dtos";

export class BranchService {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly rbacRepository: RbacRepository,
    private readonly organizationRepository: OrganizationRepository,
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
      data: {
        ...data,
        createdBy: user.id,
      } as CreateBranchRequestDto,
    });

    const organizationSettings = await this.organizationRepository.getSettings(
      branch.organizationId,
    );

    await this.branchRepository.createSettings({
      branchId: branch.id,
      logoUrl: organizationSettings?.logoUrl,
      themeMode: organizationSettings?.themeMode,
      primaryColor: organizationSettings?.primaryColor,
      languageCode: organizationSettings?.languageCode,
      currencyCode: organizationSettings?.currencyCode,
    });

    const allKeys = Array.from(
      new Set(DEFAULT_BRANCH_ROLES.flatMap((role) => role.permissions)),
    );

    const dbPermissions = await this.rbacRepository.findPermissionsByKeys({
      keys: allKeys,
    });
    const keyToIdMap = new Map(dbPermissions.map((p) => [p.key, p.id]));

    for (const defaultRole of DEFAULT_BRANCH_ROLES) {
      const role = await this.rbacRepository.createRole({
        organizationId: branch.organizationId,
        branchId: branch.id,
        name: defaultRole.name,
        description: `Default branch ${defaultRole.name.toLowerCase()} role`,
        rank: defaultRole.rank,
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

      await this.rbacRepository.createBulkPermissionMappers({
        mappers: permissionMappers,
      });
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

    const { branches, total } = await this.branchRepository.find({
      organizationId: orgIdFilter,
      branchIds: branchIdsFilter,
      page,
      limit,
      search: filters.search,
      isActive: filters.isActive,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });

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

    return this.branchRepository.findBranchesForFilters({
      organizationId: orgIdFilter,
      branchIds: branchIdsFilter,
    });
  }

  async updateBranch(
    data: UpdateBranchRequestDto,
    user: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ) {
    const { id, ...updateData } = data;
    const existing = await this.branchRepository.findOne({ id });
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

    const updated = await this.branchRepository.update({
      id,
      data: {
        ...updateData,
        updatedBy: user.id,
      },
    });

    return updated;
  }
}
