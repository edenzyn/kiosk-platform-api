import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import type { Database } from "../../config/db";
import { LicenseHistoryEventTypeEnum } from "../../shared/enums/license/license-history-event-type.enum";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import { LicenseTransactionActionTypeEnum } from "../../shared/enums/license/license-transaction-action-type.enum";
import { branches } from "../branch/branch.schema";
import { devices } from "../device/device.schema";
import type { LicenseWithDetails } from "./dtos/get-licenses.dtos";
import type {
  ActivateLicenseRepoInput,
  ActivateLicenseRepoResult,
  CreateLicensesRepoInput,
  CreateLicensesRepoResult,
  ExtendLicenseRepoInput,
  ExtendLicenseRepoResult,
  FindActiveDiscountRulesRepoInput,
  FindActiveDiscountRulesRepoResult,
  FindActiveLicenseByDeviceIdRepoInput,
  FindActiveLicenseByDeviceIdRepoResult,
  FindLicenseByDeviceIdRepoInput,
  FindLicenseByDeviceIdRepoResult,
  FindLicenseByIdRepoInput,
  FindLicenseByIdRepoResult,
  FindLicenseByKeyHashRepoInput,
  FindLicenseByKeyHashRepoResult,
  GetLicensePricingPlansRepoInput,
  GetLicensePricingPlansRepoResult,
  GetLicensesRepoInput,
  GetLicensesRepoResult,
  UpdateLicenseRepoInput,
  UpdateLicenseRepoResult,
} from "./license.types";
import { licenseDiscountRules } from "./schemas/license-discount-rule.schema";
import { licenseHistory } from "./schemas/license-history.schema";
import { licensePricing } from "./schemas/license-pricing.schema";
import { licenseTransactionItems } from "./schemas/license-transaction-item.schema";
import { licenseTransactions } from "./schemas/license-transaction.schema";
import { licenses } from "./schemas/license.schema";

export class LicenseRepository {
  constructor(private readonly database: Database) {}

  async findByDeviceId(
    input: FindLicenseByDeviceIdRepoInput,
  ): Promise<FindLicenseByDeviceIdRepoResult> {
    const [license] = await this.database.client
      .select()
      .from(licenses)
      .where(eq(licenses.deviceId, input.deviceId))
      .limit(1);

    return license || null;
  }

  async findActiveByDeviceId(
    input: FindActiveLicenseByDeviceIdRepoInput,
  ): Promise<FindActiveLicenseByDeviceIdRepoResult> {
    const now = new Date();
    const [license] = await this.database.client
      .select()
      .from(licenses)
      .where(
        and(
          eq(licenses.deviceId, input.deviceId),
          eq(licenses.status, LicenseStatusEnum.ACTIVE),
          gt(licenses.expiresAt, now),
        ),
      )
      .limit(1);

    return license || null;
  }

  async findByKeyHash(
    input: FindLicenseByKeyHashRepoInput,
  ): Promise<FindLicenseByKeyHashRepoResult> {
    const [license] = await this.database.client
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKeyHash, input.licenseKeyHash))
      .limit(1);

    return license || null;
  }

  async activate(
    input: ActivateLicenseRepoInput,
  ): Promise<ActivateLicenseRepoResult> {
    const [updated] = await this.database.client
      .update(licenses)
      .set({
        deviceId: input.deviceId,
        status: LicenseStatusEnum.ACTIVE,
        activatedAt: new Date(),
        expiresAt: input.expiresAt,
        updatedAt: new Date(),
        ...(input.branchId != null ? { branchId: input.branchId } : {}),
      })
      .where(eq(licenses.id, input.licenseId))
      .returning();

    if (!updated) {
      throw new Error("Failed to activate license");
    }

    return updated;
  }

  async findLatestPurchaseItemByLicenseId(licenseId: string) {
    const [item] = await this.database.client
      .select()
      .from(licenseTransactionItems)
      .where(
        and(
          eq(licenseTransactionItems.licenseId, licenseId),
          eq(
            licenseTransactionItems.actionType,
            LicenseTransactionActionTypeEnum.PURCHASE,
          ),
        ),
      )
      .orderBy(desc(licenseTransactionItems.createdAt))
      .limit(1);
    return item || null;
  }

  async getLicenses(
    input: GetLicensesRepoInput,
  ): Promise<GetLicensesRepoResult> {
    const {
      organizationId,
      branchId,
      page = 1,
      limit = 10,
      search,
      status,
      sortBy,
      sortOrder,
    } = input;

    const conditions = [];

    if (organizationId) {
      conditions.push(eq(licenses.organizationId, organizationId));
    }

    if (branchId) {
      conditions.push(eq(licenses.branchId, branchId));
    }

    if (status !== undefined && status !== null) {
      conditions.push(eq(licenses.status, status));
    }

    if (search) {
      conditions.push(
        or(
          ilike(devices.name, `%${search}%`),
          ilike(branches.name, `%${search}%`),
        ),
      );
    }

    const condition = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query
    const countQuery = this.database.client
      .select({ count: count() })
      .from(licenses)
      .leftJoin(branches, eq(licenses.branchId, branches.id))
      .leftJoin(devices, eq(licenses.deviceId, devices.id));

    const [countResult] = condition
      ? await countQuery.where(condition)
      : await countQuery;
    const total = Number(countResult?.count || 0);

    // Select query
    let query = this.database.client
      .select({
        id: licenses.id,
        licenseKey: licenses.licenseKey,
        organizationId: licenses.organizationId,
        branchId: licenses.branchId,
        branchName: branches.name,
        deviceId: licenses.deviceId,
        deviceName: devices.name,
        status: licenses.status,
        activatedAt: licenses.activatedAt,
        expiresAt: licenses.expiresAt,
        createdAt: licenses.createdAt,
        updatedAt: licenses.updatedAt,
      })
      .from(licenses)
      .leftJoin(branches, eq(licenses.branchId, branches.id))
      .leftJoin(devices, eq(licenses.deviceId, devices.id))
      .$dynamic();

    if (condition) {
      query = query.where(condition);
    }

    if (sortBy && sortOrder) {
      const orderFn = sortOrder === "asc" ? asc : desc;
      if (sortBy === "status") {
        query = query.orderBy(orderFn(licenses.status));
      } else if (sortBy === "expiresAt") {
        query = query.orderBy(orderFn(licenses.expiresAt));
      } else if (sortBy === "createdAt") {
        query = query.orderBy(orderFn(licenses.createdAt));
      }
    } else {
      query = query.orderBy(desc(licenses.createdAt));
    }

    if (page && limit) {
      query = query.limit(limit).offset((page - 1) * limit);
    }

    const rows = await query;

    return {
      licenses: rows as LicenseWithDetails[],
      total,
    };
  }

  async createLicenses(
    input: CreateLicensesRepoInput,
  ): Promise<CreateLicensesRepoResult> {
    if (input.transaction) {
      const result = await this.database.client.transaction(async (tx) => {
        const [insertedTx] = await tx
          .insert(licenseTransactions)
          .values({
            userId: input.transaction!.userId,
            transactionType: input.transaction!.transactionType,
            subtotalAmount: input.transaction!.subtotalAmount,
            discountAmount: input.transaction!.discountAmount,
            discountPercentage: input.transaction!.discountPercentage,
            appliedDiscountRuleId: input.transaction!.appliedDiscountRuleId,
            totalAmount: input.transaction!.totalAmount,
            currency: input.transaction!.currency,
            paymentStatus: input.transaction!.paymentStatus,
            transactionAt: new Date(),
            createdBy: input.transaction!.userId,
            updatedBy: input.transaction!.userId,
          })
          .returning();

        if (!insertedTx) {
          throw new Error("Failed to create license transaction record");
        }

        const createdLicenses = await tx
          .insert(licenses)
          .values(input.licenses)
          .returning();

        for (let i = 0; i < createdLicenses.length; i++) {
          const license = createdLicenses[i];
          const itemSpec =
            input.transactionItems?.[i] || input.transactionItems?.[0];

          if (itemSpec && license) {
            await tx.insert(licenseTransactionItems).values({
              transactionId: insertedTx.id,
              licenseId: license.id,
              actionType: itemSpec.actionType,
              durationDays: itemSpec.durationDays,
              baseUnitPrice: itemSpec.baseUnitPrice,
              discountPercentage: itemSpec.discountPercentage,
              unitPrice: itemSpec.unitPrice,
            });
          }

          if (license) {
            await tx.insert(licenseHistory).values({
              licenseId: license.id,
              eventType: LicenseHistoryEventTypeEnum.PURCHASE,
              newStatus: license.status,
              newExpiresAt: license.expiresAt,
              transactionId: insertedTx.id,
              performedBy: input.transaction!.userId,
              remarks: "Purchased via pricing plan",
            });
          }
        }

        return createdLicenses;
      });

      return result;
    }

    const created = await this.database.client
      .insert(licenses)
      .values(input.licenses)
      .returning();

    return created;
  }

  async findById(
    input: FindLicenseByIdRepoInput,
  ): Promise<FindLicenseByIdRepoResult> {
    const [license] = await this.database.client
      .select()
      .from(licenses)
      .where(
        and(
          eq(licenses.id, input.licenseId),
          eq(licenses.organizationId, input.organizationId),
        ),
      )
      .limit(1);

    return license || null;
  }

  async update(
    input: UpdateLicenseRepoInput,
  ): Promise<UpdateLicenseRepoResult> {
    const [updated] = await this.database.client
      .update(licenses)
      .set({
        ...input.data,
        updatedAt: new Date(),
      })
      .where(eq(licenses.id, input.licenseId))
      .returning();

    if (!updated) {
      throw new Error("Failed to update license");
    }

    return updated;
  }

  async getLicensePricingPlans(
    input: GetLicensePricingPlansRepoInput,
  ): Promise<GetLicensePricingPlansRepoResult> {
    const query = this.database.client
      .select()
      .from(licensePricing)
      .where(
        input.id
          ? and(
              eq(licensePricing.isActive, true),
              eq(licensePricing.id, input.id),
            )
          : eq(licensePricing.isActive, true),
      )
      .orderBy(asc(licensePricing.durationDays));

    const plans = await query;
    return plans;
  }

  async findActiveDiscountRules(
    input: FindActiveDiscountRulesRepoInput,
  ): Promise<FindActiveDiscountRulesRepoResult> {
    const now = new Date();
    const rules = await this.database.client
      .select()
      .from(licenseDiscountRules)
      .where(
        and(
          eq(licenseDiscountRules.targetEntity, input.targetEntity),
          eq(licenseDiscountRules.isActive, true),
          or(
            isNull(licenseDiscountRules.startsAt),
            lte(licenseDiscountRules.startsAt, now),
          ),
          or(
            isNull(licenseDiscountRules.endsAt),
            gte(licenseDiscountRules.endsAt, now),
          ),
        ),
      );

    return rules;
  }

  async extendLicense(
    input: ExtendLicenseRepoInput,
  ): Promise<ExtendLicenseRepoResult> {
    const result = await this.database.client.transaction(async (tx) => {
      // 1. Create transaction record
      const [insertedTx] = await tx
        .insert(licenseTransactions)
        .values({
          userId: input.transaction.userId,
          transactionType: input.transaction.transactionType,
          subtotalAmount: input.transaction.subtotalAmount,
          discountAmount: input.transaction.discountAmount,
          discountPercentage: input.transaction.discountPercentage,
          appliedDiscountRuleId: input.transaction.appliedDiscountRuleId,
          totalAmount: input.transaction.totalAmount,
          currency: input.transaction.currency,
          paymentStatus: input.transaction.paymentStatus,
          transactionAt: new Date(),
          createdBy: input.transaction.userId,
          updatedBy: input.transaction.userId,
        })
        .returning();

      if (!insertedTx) {
        throw new Error("Failed to create license transaction record");
      }

      // 2. Update license expiresAt and status
      const [updatedLicense] = await tx
        .update(licenses)
        .set({
          expiresAt: input.newExpiresAt,
          status: input.newStatus,
          updatedAt: new Date(),
          updatedBy: input.transaction.userId,
        })
        .where(eq(licenses.id, input.licenseId))
        .returning();

      if (!updatedLicense) {
        throw new Error("Failed to update license");
      }

      // 3. Create transaction item record
      await tx.insert(licenseTransactionItems).values({
        transactionId: insertedTx.id,
        licenseId: input.licenseId,
        actionType: input.transactionItem.actionType,
        durationDays: input.transactionItem.durationDays,
        baseUnitPrice: input.transactionItem.baseUnitPrice,
        discountPercentage: input.transactionItem.discountPercentage,
        unitPrice: input.transactionItem.unitPrice,
      });

      // 4. Create license history record
      await tx.insert(licenseHistory).values({
        licenseId: input.licenseId,
        eventType: input.historyEvent.eventType,
        previousStatus: input.historyEvent.previousStatus,
        newStatus: input.newStatus,
        previousExpiresAt: input.historyEvent.previousExpiresAt,
        newExpiresAt: input.newExpiresAt,
        transactionId: insertedTx.id,
        performedBy: input.transaction.userId,
        remarks: input.historyEvent.remarks,
      });

      return updatedLicense;
    });

    return result;
  }
}
