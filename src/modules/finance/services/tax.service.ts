import type { EffectiveTenant } from "../../../shared/dtos/effective-tenant.dto";
import { BadRequestError } from "../../../shared/errors/bad-request-error";
import { NotFoundError } from "../../../shared/errors/not-found-error";
import type { BranchRepository } from "../../branch/branch.repository";
import type { TaxRepository } from "../repositories/tax.repository";
import type {
  GetBranchTaxProfileForCloneServiceInput,
  GetTenantTaxProfileServiceInput,
  TenantTaxProfileWithComponents,
  UpdateTenantTaxProfileServiceInput,
} from "../types/tax.types";

export class TaxService {
  constructor(
    private readonly taxRepository: TaxRepository,
    private readonly branchRepository: BranchRepository,
  ) {}

  // ========================================
  // ? TENANT TAX PROFILES
  // ========================================
  async getTenantTaxProfile(
    input: GetTenantTaxProfileServiceInput,
  ): Promise<TenantTaxProfileWithComponents | null> {
    const branchId = this.requireTaxBranch(input.effectiveTenant);

    return this.taxRepository.findTenantProfile({
      organizationId: input.effectiveTenant.organizationId,
      branchId,
      conditionTypes: input.filters?.conditionTypes,
    });
  }

  async updateTenantTaxProfile(
    input: UpdateTenantTaxProfileServiceInput,
  ): Promise<TenantTaxProfileWithComponents> {
    const { data, user, effectiveTenant } = input;
    const branchId = this.requireTaxBranch(effectiveTenant);
    const organizationId = effectiveTenant.organizationId;

    const existing = await this.taxRepository.findTenantProfile({
      organizationId,
      branchId,
    });

    if (!existing) {
      return this.taxRepository.createTenantProfile({
        data: {
          organizationId,
          branchId,
          name: data.name,
          isTaxInclusive: data.isTaxInclusive ?? false,
          components: data.components,
          createdBy: user.id,
        },
      });
    }

    const profile = await this.taxRepository.updateTenantProfile({
      data: {
        id: existing.id,
        organizationId,
        branchId,
        name: data.name,
        isTaxInclusive: data.isTaxInclusive ?? false,
        components: data.components,
        updatedBy: user.id,
      },
    });

    if (!profile) {
      throw new NotFoundError("Tax profile not found");
    }

    return profile;
  }

  async getBranchTaxProfileForClone(
    input: GetBranchTaxProfileForCloneServiceInput,
  ): Promise<TenantTaxProfileWithComponents | null> {
    const targetBranchId = this.requireTaxBranch(input.effectiveTenant);
    const sourceBranch = await this.findCloneSourceOrThrow(
      input.branchId,
      input.effectiveTenant,
      targetBranchId,
    );

    return this.taxRepository.findTenantProfile({
      organizationId: input.effectiveTenant.organizationId,
      branchId: sourceBranch.id,
      conditionTypes: input.filters?.conditionTypes,
    });
  }

  private async findCloneSourceOrThrow(
    sourceBranchId: string,
    effectiveTenant: EffectiveTenant,
    targetBranchId: string,
  ) {
    if (sourceBranchId === targetBranchId) {
      throw new BadRequestError("Pick a different branch to clone from");
    }

    const branch = await this.branchRepository.findOne({
      id: sourceBranchId,
      organizationId: effectiveTenant.organizationId,
    });

    if (!branch) {
      throw new NotFoundError("Branch not found");
    }

    return branch;
  }

  private requireTaxBranch(effectiveTenant: EffectiveTenant): string {
    if (!effectiveTenant.branchId) {
      throw new BadRequestError(
        "A branch must be selected to manage tax profiles",
      );
    }

    return effectiveTenant.branchId;
  }
}
