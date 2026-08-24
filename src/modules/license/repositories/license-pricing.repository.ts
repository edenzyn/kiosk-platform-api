import { and, asc, count, eq, ilike, type SQL } from "drizzle-orm";
import type { Database } from "../../../config/db";
import type {
  CreatePricingPlanRepoInput,
  CreatePricingPlanRepoResult,
  FindLicensePricingPlansRepoInput,
  FindLicensePricingPlansRepoResult,
  FindOnePricingPlanRepoInput,
  FindOnePricingPlanRepoResult,
  FindPricingPlansPaginatedRepoInput,
  FindPricingPlansPaginatedRepoResult,
  UpdatePricingPlanRepoInput,
  UpdatePricingPlanRepoResult,
} from "../license.types";
import { licensePricing } from "../schemas/license-pricing.schema";

export class LicensePricingRepository {
  constructor(private readonly database: Database) {}

  async findPricingPlans(
    input: FindLicensePricingPlansRepoInput,
  ): Promise<FindLicensePricingPlansRepoResult> {
    const conditions: SQL[] = [];

    if (input.id) {
      conditions.push(eq(licensePricing.id, input.id));
    }

    if (input.isActive !== undefined) {
      conditions.push(eq(licensePricing.isActive, input.isActive));
    }

    const plans = await this.database.client
      .select()
      .from(licensePricing)
      .where(and(...conditions))
      .orderBy(asc(licensePricing.durationDays));

    return plans;
  }

  async findPricingPlansPaginated(
    input: FindPricingPlansPaginatedRepoInput,
  ): Promise<FindPricingPlansPaginatedRepoResult> {
    const { search, isActive, page, limit } = input;

    const conditions: (SQL | undefined)[] = [];
    if (isActive !== undefined) {
      conditions.push(eq(licensePricing.isActive, isActive));
    }
    if (search) {
      conditions.push(ilike(licensePricing.name, `%${search}%`));
    }
    const condition = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.database.client
      .select({ count: count() })
      .from(licensePricing)
      .where(condition);
    const total = Number(countResult?.count || 0);

    const plans = await this.database.client
      .select()
      .from(licensePricing)
      .where(condition)
      .orderBy(asc(licensePricing.durationDays))
      .limit(limit)
      .offset((page - 1) * limit);

    return { plans, total };
  }

  async createPricingPlan(
    input: CreatePricingPlanRepoInput,
  ): Promise<CreatePricingPlanRepoResult> {
    const [plan] = await this.database.client
      .insert(licensePricing)
      .values({
        name: input.name,
        deviceType: input.deviceType,
        durationDays: input.durationDays,
        price: String(input.price),
        currency: input.currency,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .returning();

    if (!plan) throw new Error("Failed to create pricing plan");
    return plan;
  }

  async findPricingPlan(
    input: FindOnePricingPlanRepoInput,
  ): Promise<FindOnePricingPlanRepoResult> {
    const [plan] = await this.database.client
      .select()
      .from(licensePricing)
      .where(eq(licensePricing.id, input.id))
      .limit(1);

    return plan ?? null;
  }

  async updatePricingPlan(
    input: UpdatePricingPlanRepoInput,
  ): Promise<UpdatePricingPlanRepoResult> {
    const [updated] = await this.database.client
      .update(licensePricing)
      .set({
        ...input.data,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(licensePricing.id, input.id))
      .returning();

    if (!updated) throw new Error("Pricing plan not found");
    return updated;
  }
}
