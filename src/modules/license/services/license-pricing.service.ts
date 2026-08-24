import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { AppError } from "../../../shared/errors/app-error";
import type {
  CreatePricingPlanServiceInput,
  CreatePricingPlanServiceResult,
  GetLicensePricingPlansServiceInput,
  GetLicensePricingPlansServiceResult,
  GetPlatformPricingPlansServiceInput,
  GetPlatformPricingPlansServiceResult,
  TogglePricingPlanStatusServiceInput,
  TogglePricingPlanStatusServiceResult,
  UpdatePricingPlanServiceInput,
  UpdatePricingPlanServiceResult,
} from "../license.types";
import type { LicensePricingRepository } from "../repositories/license-pricing.repository";

export class LicensePricingService {
  constructor(
    private readonly licensePricingRepository: LicensePricingRepository,
  ) {}

  async getLicensePricingPlans(
    input: GetLicensePricingPlansServiceInput,
  ): Promise<GetLicensePricingPlansServiceResult> {
    const plans = await this.licensePricingRepository.findPricingPlans({
      id: input.id,
      isActive: true,
    });
    return { plans };
  }

  async getPlatformPricingPlans(
    input: GetPlatformPricingPlansServiceInput,
  ): Promise<GetPlatformPricingPlansServiceResult> {
    const { isActive } = input.query;

    const plans = await this.licensePricingRepository.findPricingPlans({
      isActive,
    });

    return { plans };
  }

  async createPricingPlan(
    input: CreatePricingPlanServiceInput,
  ): Promise<CreatePricingPlanServiceResult> {
    const plan = await this.licensePricingRepository.createPricingPlan({
      name: input.dto.name,
      deviceType: input.dto.deviceType,
      durationDays: input.dto.durationDays,
      price: input.dto.price,
      currency: input.dto.currency,
      createdBy: input.currentUser.id,
    });

    return { plan };
  }

  async togglePricingPlanStatus(
    input: TogglePricingPlanStatusServiceInput,
  ): Promise<TogglePricingPlanStatusServiceResult> {
    const existing = await this.licensePricingRepository.findPricingPlan({
      id: input.planId,
    });
    if (!existing) {
      throw new AppError("Pricing plan not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const plan = await this.licensePricingRepository.updatePricingPlan({
      id: input.planId,
      updatedBy: input.currentUser.id,
      data: { isActive: !existing.isActive },
    });
    return { plan };
  }

  async updatePricingPlan(
    input: UpdatePricingPlanServiceInput,
  ): Promise<UpdatePricingPlanServiceResult> {
    const existing = await this.licensePricingRepository.findPricingPlan({
      id: input.planId,
    });
    if (!existing) {
      throw new AppError("Pricing plan not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const plan = await this.licensePricingRepository.updatePricingPlan({
      id: input.planId,
      updatedBy: input.currentUser.id,
      data: {
        name: input.dto.name,
        deviceType: input.dto.deviceType,
        durationDays: input.dto.durationDays,
        price: String(input.dto.price),
        currency: input.dto.currency,
      },
    });
    return { plan };
  }
}
