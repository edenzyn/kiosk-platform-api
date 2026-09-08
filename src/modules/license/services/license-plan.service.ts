import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { AppError } from "../../../shared/errors/app-error";
import type {
  CreateLicensePlanServiceInput,
  CreateLicensePlanServiceResult,
  GetLicensePlansServiceInput,
  GetLicensePlansServiceResult,
  GetPlatformLicensePlansServiceInput,
  GetPlatformLicensePlansServiceResult,
  ToggleLicensePlanStatusServiceInput,
  ToggleLicensePlanStatusServiceResult,
  UpdateLicensePlanServiceInput,
  UpdateLicensePlanServiceResult,
} from "../license.types";
import type { LicensePlanRepository } from "../repositories/license-plan.repository";

export class LicensePlanService {
  constructor(private readonly licensePlanRepository: LicensePlanRepository) {}

  async getLicensePlans(
    input: GetLicensePlansServiceInput,
  ): Promise<GetLicensePlansServiceResult> {
    const plans = await this.licensePlanRepository.findLicensePlansWithMarketPrices({
      id: input.id,
      isActive: true,
    });
    return { plans };
  }

  async getPlatformLicensePlans(
    input: GetPlatformLicensePlansServiceInput,
  ): Promise<GetPlatformLicensePlansServiceResult> {
    const { page, limit, search, isActive, marketId } = input.query;

    const { plans, total } =
      await this.licensePlanRepository.findLicensePlansPaginated({
        page,
        limit,
        search,
        isActive,
        marketId,
      });

    return {
      plans,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createLicensePlan(
    input: CreateLicensePlanServiceInput,
  ): Promise<CreateLicensePlanServiceResult> {
    const plan = await this.licensePlanRepository.createLicensePlan({
      name: input.dto.name,
      deviceType: input.dto.deviceType,
      durationDays: input.dto.durationDays,
      marketPrices: input.dto.marketPrices,
      createdBy: input.currentUser.id,
    });

    return { plan };
  }

  async toggleLicensePlanStatus(
    input: ToggleLicensePlanStatusServiceInput,
  ): Promise<ToggleLicensePlanStatusServiceResult> {
    const existing = await this.licensePlanRepository.findLicensePlan({
      id: input.planId,
    });
    if (!existing) {
      throw new AppError("License plan not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const plan = await this.licensePlanRepository.updateLicensePlan({
      id: input.planId,
      updatedBy: input.currentUser.id,
      data: { isActive: !existing.isActive },
    });
    return { plan };
  }

  async updateLicensePlan(
    input: UpdateLicensePlanServiceInput,
  ): Promise<UpdateLicensePlanServiceResult> {
    const existing = await this.licensePlanRepository.findLicensePlan({
      id: input.planId,
    });
    if (!existing) {
      throw new AppError("License plan not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const plan = await this.licensePlanRepository.updateLicensePlan({
      id: input.planId,
      updatedBy: input.currentUser.id,
      data: {
        name: input.dto.name,
        deviceType: input.dto.deviceType,
        durationDays: input.dto.durationDays,
        marketPrices: input.dto.marketPrices,
      },
    });
    return { plan };
  }
}
