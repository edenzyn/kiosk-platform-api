import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import { AppError } from "../../../shared/errors/app-error";
import type { LicenseDiscountRepository } from "../repositories/license-discount.repository";
import type {
  CreateDiscountRuleServiceInput,
  CreateDiscountRuleServiceResult,
  GetDiscountRulesServiceInput,
  GetDiscountRulesServiceResult,
  GetPlatformDiscountRulesServiceInput,
  GetPlatformDiscountRulesServiceResult,
  ToggleDiscountRuleStatusServiceInput,
  ToggleDiscountRuleStatusServiceResult,
  UpdateDiscountRuleServiceInput,
  UpdateDiscountRuleServiceResult,
} from "../license.types";
import type { LicenseDiscountRuleEntity } from "../schemas/license-discount-rule.schema";

export class LicenseDiscountService {
  constructor(
    private readonly licenseDiscountRepository: LicenseDiscountRepository,
  ) {}

  private async _attachTargets<T extends { id: string; targetEntity: number }>(
    rules: T[],
    options: { includeResellerTargets?: boolean } = {},
  ): Promise<(T & { targets: { id: string; name: string }[] })[]> {
    const { includeResellerTargets = true } = options;

    const individualRuleIdsByEntity = new Map<number, string[]>();
    for (const rule of rules) {
      if (
        rule.targetEntity ===
          LicenseDiscountRuleTargetEntityTypeEnum.RESELLER_INDIVIDUAL &&
        includeResellerTargets
      ) {
        const existing = individualRuleIdsByEntity.get(rule.targetEntity) ?? [];
        existing.push(rule.id);
        individualRuleIdsByEntity.set(rule.targetEntity, existing);
      } else if (
        rule.targetEntity ===
        LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL
      ) {
        const existing = individualRuleIdsByEntity.get(rule.targetEntity) ?? [];
        existing.push(rule.id);
        individualRuleIdsByEntity.set(rule.targetEntity, existing);
      }
    }

    const targetsByRuleId = new Map<string, { id: string; name: string }[]>();
    for (const [targetEntity, ruleIds] of individualRuleIdsByEntity) {
      const targets = await this.licenseDiscountRepository.findDiscountRuleTargets({
        ruleIds,
        targetEntity,
      });
      for (const [ruleId, ruleTargets] of targets) {
        targetsByRuleId.set(ruleId, ruleTargets);
      }
    }

    return rules.map((rule) => ({
      ...rule,
      targets: targetsByRuleId.get(rule.id) ?? [],
    }));
  }

  async getDiscountRules(
    input: GetDiscountRulesServiceInput,
  ): Promise<GetDiscountRulesServiceResult> {
    const rules = await this.licenseDiscountRepository.findActiveDiscountRules({
      targetEntity: input.targetEntity,
      resellerId: input.resellerId,
    });
    return {
      rules: await this._attachTargets(rules, { includeResellerTargets: false }),
    };
  }

  async getPlatformDiscountRules(
    input: GetPlatformDiscountRulesServiceInput,
  ): Promise<GetPlatformDiscountRulesServiceResult> {
    const { page = 1, limit = 10, search, targetEntity, isActive, sortBy, sortOrder } =
      input.query;

    const { rules, total } =
      await this.licenseDiscountRepository.findPaginatedDiscountRules({
        page,
        limit,
        search,
        targetEntity,
        isActive,
        sortBy,
        sortOrder,
      });

    return {
      rules: await this._attachTargets(rules),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async _fetchTargetsForRule(
    rule: LicenseDiscountRuleEntity,
  ): Promise<{ id: string; name: string }[]> {
    if (
      rule.targetEntity !==
        LicenseDiscountRuleTargetEntityTypeEnum.RESELLER_INDIVIDUAL &&
      rule.targetEntity !==
        LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL
    ) {
      return [];
    }

    const targetsMap = await this.licenseDiscountRepository.findDiscountRuleTargets({
      ruleIds: [rule.id],
      targetEntity: rule.targetEntity,
    });
    return targetsMap.get(rule.id) ?? [];
  }

  async createDiscountRule(
    input: CreateDiscountRuleServiceInput,
  ): Promise<CreateDiscountRuleServiceResult> {
    const { dto, currentUser } = input;

    const rule = await this.licenseDiscountRepository.createDiscountRuleWithTargets({
      name: dto.name,
      targetEntity: dto.targetEntity,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      currency: dto.currency,
      minQuantity: dto.minQuantity,
      maxQuantity: dto.maxQuantity,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      resellerIds: dto.resellerIds,
      pricingPlanIds: dto.pricingPlanIds,
      createdBy: currentUser.id,
    });

    const targets = await this._fetchTargetsForRule(rule);
    return { rule: { ...rule, targets } };
  }

  async updateDiscountRule(
    input: UpdateDiscountRuleServiceInput,
  ): Promise<UpdateDiscountRuleServiceResult> {
    const { ruleId, dto, currentUser } = input;

    const existing = await this.licenseDiscountRepository.findDiscountRule({
      ruleId,
    });
    if (!existing) {
      throw new AppError("Discount rule not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const rule = await this.licenseDiscountRepository.updateDiscountRuleWithTargets({
      ruleId,
      name: dto.name,
      targetEntity: dto.targetEntity,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      currency: dto.currency,
      minQuantity: dto.minQuantity,
      maxQuantity: dto.maxQuantity,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      resellerIds: dto.resellerIds,
      pricingPlanIds: dto.pricingPlanIds,
      updatedBy: currentUser.id,
    });

    const targets = await this._fetchTargetsForRule(rule);
    return { rule: { ...rule, targets } };
  }

  async toggleDiscountRuleStatus(
    input: ToggleDiscountRuleStatusServiceInput,
  ): Promise<ToggleDiscountRuleStatusServiceResult> {
    const existing = await this.licenseDiscountRepository.findDiscountRule({
      ruleId: input.ruleId,
    });
    if (!existing) {
      throw new AppError("Discount rule not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const rule = await this.licenseDiscountRepository.updateDiscountRule({
      ruleId: input.ruleId,
      updatedBy: input.currentUser.id,
      data: { isActive: !existing.isActive },
    });
    return { rule };
  }
}
