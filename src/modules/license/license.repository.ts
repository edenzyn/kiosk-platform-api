import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../../config/db";
import { LicenseHistoryEventTypeEnum } from "../../shared/enums/license/license-history-event-type.enum";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import { LicenseTransactionActionTypeEnum } from "../../shared/enums/license/license-transaction-action-type.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { branches } from "../branch/branch.schema";
import { devices } from "../device/device.schema";
import { organizations } from "../organization/organization.schema";
import { users } from "../user/schemas/user.schema";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import { resellerDiscountRuleMapper } from "../reseller/schemas/reseller-discount-rule-mapper.schema";
import type { LicenseWithDetails } from "./dtos/get-licenses.dtos";
import type {
  ActivateLicenseRepoInput,
  ActivateLicenseRepoResult,
  CreateDiscountRuleWithTargetsRepoInput,
  CreateDiscountRuleWithTargetsRepoResult,
  CreateLicenseHistoryRepoInput,
  CreateLicenseHistoryRepoResult,
  CreateLicensesRepoInput,
  CreateLicensesRepoResult,
  ExtendLicenseRepoInput,
  ExtendLicenseRepoResult,
  FindActiveDiscountRulesRepoInput,
  FindActiveDiscountRulesRepoResult,
  FindDiscountRuleTargetsRepoInput,
  FindDiscountRuleTargetsRepoResult,
  FindLicenseHistoryRepoInput,
  FindLicenseHistoryRepoResult,
  FindLicensePricingPlansRepoInput,
  FindLicensePricingPlansRepoResult,
  FindLicensesByResellerRepoInput,
  FindLicensesByResellerRepoResult,
  FindLicensesForStatusCheckRepoInput,
  FindLicensesForStatusCheckRepoResult,
  FindLicensesRepoInput,
  FindLicensesRepoResult,
  FindOneActiveLicenseByDeviceIdRepoInput,
  FindOneActiveLicenseByDeviceIdRepoResult,
  FindOneLicenseDetailsRepoInput,
  FindOneLicenseDetailsRepoResult,
  FindOneLicenseRepoInput,
  FindOneLicenseRepoResult,
  FindOneDiscountRuleRepoInput,
  FindOneDiscountRuleRepoResult,
  FindPaginatedDiscountRulesRepoInput,
  FindPaginatedDiscountRulesRepoResult,
  FindPricingPlansPaginatedRepoInput,
  FindPricingPlansPaginatedRepoResult,
  IsLicenseOwnedByResellerRepoInput,
  IsLicenseOwnedByResellerRepoResult,
  UpdateDiscountRuleRepoInput,
  UpdateDiscountRuleRepoResult,
  UpdateLicenseRepoInput,
  UpdateLicenseRepoResult,
} from "./license.types";
import { licenseDiscountRules } from "./schemas/license-discount-rule.schema";
import { licenseHistory } from "./schemas/license-history.schema";
import { licensePricingDiscountRuleMapper } from "./schemas/license-pricing-discount-rule-mapper.schema";
import { licensePricing } from "./schemas/license-pricing.schema";
import { licenseResellerMapper } from "./schemas/license-reseller-mapper.schema";
import { licenseTransactionItems } from "./schemas/license-transaction-item.schema";
import { licenseTransactions } from "./schemas/license-transaction.schema";
import { licenses } from "./schemas/license.schema";

export class LicenseRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? LICENSE SCHEMA METHODS
  // ========================================
  async findOne(
    input: FindOneLicenseRepoInput,
  ): Promise<FindOneLicenseRepoResult> {
    const conditions: (SQL | undefined)[] = [];

    if (input.id !== undefined) conditions.push(eq(licenses.id, input.id));
    if (input.deviceId !== undefined) {
      conditions.push(eq(licenses.deviceId, input.deviceId));
    }
    if (input.licenseKeyHash !== undefined) {
      conditions.push(eq(licenses.licenseKeyHash, input.licenseKeyHash));
    }
    if (input.organizationId !== undefined) {
      conditions.push(eq(licenses.organizationId, input.organizationId));
    }

    if (conditions.length === 0) {
      return null;
    }

    const [license] = await this.database.client
      .select()
      .from(licenses)
      .where(and(...conditions))
      .limit(1);

    return license || null;
  }

  async findOneActiveByDeviceId(
    input: FindOneActiveLicenseByDeviceIdRepoInput,
  ): Promise<FindOneActiveLicenseByDeviceIdRepoResult> {
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

  async findOneDetails(
    input: FindOneLicenseDetailsRepoInput,
  ): Promise<FindOneLicenseDetailsRepoResult> {
    const [license] = await this.database.client
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
      .where(eq(licenses.id, input.licenseId))
      .limit(1);

    const transactions = await this.database.client
      .select({
        id: licenseTransactionItems.id,
        transactionId: licenseTransactionItems.transactionId,
        actionType: licenseTransactionItems.actionType,
        durationDays: licenseTransactionItems.durationDays,
        baseUnitPrice: licenseTransactionItems.baseUnitPrice,
        discountPercentage: licenseTransactionItems.discountPercentage,
        unitPrice: licenseTransactionItems.unitPrice,
        createdAt: licenseTransactionItems.createdAt,
        paymentStatus: licenseTransactions.paymentStatus,
        currency: licenseTransactions.currency,
        totalAmount: licenseTransactions.totalAmount,
        performedByName: users.name,
      })
      .from(licenseTransactionItems)
      .leftJoin(
        licenseTransactions,
        eq(licenseTransactionItems.transactionId, licenseTransactions.id),
      )
      .leftJoin(users, eq(licenseTransactions.userId, users.id))
      .where(eq(licenseTransactionItems.licenseId, input.licenseId))
      .orderBy(desc(licenseTransactionItems.createdAt));

    return {
      license: license || null,
      transactions,
    };
  }

  async find(input: FindLicensesRepoInput): Promise<FindLicensesRepoResult> {
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

  async findByReseller(
    input: FindLicensesByResellerRepoInput,
  ): Promise<FindLicensesByResellerRepoResult> {
    const {
      resellerId,
      page = 1,
      limit = 10,
      status,
      sortBy,
      sortOrder,
    } = input;

    const conditions = [
      eq(licenseResellerMapper.resellerId, resellerId),
      eq(licenseResellerMapper.isActive, true),
    ];

    if (status !== undefined && status !== null) {
      conditions.push(eq(licenses.status, status));
    }

    // License keys are stored encrypted/hashed, so there is no plaintext
    // field to search reseller-owned licenses by yet.

    const condition = and(...conditions);

    const [countResult] = await this.database.client
      .select({ count: count() })
      .from(licenseResellerMapper)
      .innerJoin(licenses, eq(licenseResellerMapper.licenseId, licenses.id))
      .where(condition);
    const total = Number(countResult?.count || 0);

    let query = this.database.client
      .select({
        id: licenses.id,
        licenseKey: licenses.licenseKey,
        organizationId: licenses.organizationId,
        organizationName: organizations.name,
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
      .from(licenseResellerMapper)
      .innerJoin(licenses, eq(licenseResellerMapper.licenseId, licenses.id))
      .leftJoin(organizations, eq(licenses.organizationId, organizations.id))
      .leftJoin(branches, eq(licenses.branchId, branches.id))
      .leftJoin(devices, eq(licenses.deviceId, devices.id))
      .where(condition)
      .$dynamic();

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

  async isLicenseOwnedByReseller(
    input: IsLicenseOwnedByResellerRepoInput,
  ): Promise<IsLicenseOwnedByResellerRepoResult> {
    const [mapping] = await this.database.client
      .select({ id: licenseResellerMapper.id })
      .from(licenseResellerMapper)
      .where(
        and(
          eq(licenseResellerMapper.licenseId, input.licenseId),
          eq(licenseResellerMapper.resellerId, input.resellerId),
          eq(licenseResellerMapper.isActive, true),
        ),
      )
      .limit(1);

    return !!mapping;
  }

  async findLicensesForStatusCheck(
    input?: FindLicensesForStatusCheckRepoInput,
  ): Promise<FindLicensesForStatusCheckRepoResult> {
    const targetStatuses = input?.statuses ?? [
      LicenseStatusEnum.ACTIVE,
      LicenseStatusEnum.GRACE_PERIOD,
    ];

    return this.database.client
      .select()
      .from(licenses)
      .where(
        and(
          inArray(licenses.status, targetStatuses),
          isNotNull(licenses.expiresAt),
        ),
      );
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
              targetEntityType:
                input.historyTargetEntityType ?? UserTypeEnums.NORMAL,
              newStatus: license.status,
              newExpiresAt: license.expiresAt,
              transactionId: insertedTx.id,
              performedBy: input.transaction!.userId,
              remarks: "Purchased via pricing plan",
            });

            if (input.resellerId) {
              await tx.insert(licenseResellerMapper).values({
                licenseId: license.id,
                resellerId: input.resellerId,
                assignedAt: new Date(),
                isActive: true,
                createdBy: input.transaction!.userId,
                updatedBy: input.transaction!.userId,
              });
            }
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

  async extendLicense(
    input: ExtendLicenseRepoInput,
  ): Promise<ExtendLicenseRepoResult> {
    const result = await this.database.client.transaction(async (tx) => {
      // 1. Create transaction record
      const [insertedTx] = await tx
        .insert(licenseTransactions)
        .values({
          userId: input.transaction.userId,
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
        targetEntityType: input.historyEvent.targetEntityType,
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

    const [names] = await this.database.client
      .select({
        branchName: branches.name,
        deviceName: devices.name,
      })
      .from(licenses)
      .leftJoin(branches, eq(licenses.branchId, branches.id))
      .leftJoin(devices, eq(licenses.deviceId, devices.id))
      .where(eq(licenses.id, updated.id))
      .limit(1);

    return {
      ...updated,
      branchName: names?.branchName ?? null,
      deviceName: names?.deviceName ?? null,
    };
  }

  // ========================================
  // ? LICENSE PRICING & DISCOUNT SCHEMA METHODS
  // ========================================
  async findPricingPlans(
    input: FindLicensePricingPlansRepoInput,
  ): Promise<FindLicensePricingPlansRepoResult> {
    const conditions: SQL[] = [];

    if (input.id) {
      conditions.push(eq(licensePricing.id, input.id));
    }

    const isActiveFilter = input.isActive ?? true;
    conditions.push(eq(licensePricing.isActive, isActiveFilter));

    const plans = await this.database.client
      .select()
      .from(licensePricing)
      .where(and(...conditions))
      .orderBy(asc(licensePricing.durationDays));

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

  // ========================================
  // ? PLATFORM DISCOUNT RULE & PRICING METHODS
  // ========================================
  async findDiscountRule(
    input: FindOneDiscountRuleRepoInput,
  ): Promise<FindOneDiscountRuleRepoResult> {
    const [rule] = await this.database.client
      .select()
      .from(licenseDiscountRules)
      .where(eq(licenseDiscountRules.id, input.ruleId))
      .limit(1);

    return rule ?? null;
  }

  async findPaginatedDiscountRules(
    input: FindPaginatedDiscountRulesRepoInput,
  ): Promise<FindPaginatedDiscountRulesRepoResult> {
    const { search, targetEntity, isActive, page, limit, sortBy, sortOrder } =
      input;

    const conditions: (SQL | undefined)[] = [];
    if (targetEntity !== undefined) {
      conditions.push(eq(licenseDiscountRules.targetEntity, targetEntity));
    }
    if (isActive !== undefined) {
      conditions.push(eq(licenseDiscountRules.isActive, isActive));
    }
    if (search) {
      conditions.push(ilike(licenseDiscountRules.name, `%${search}%`));
    }
    const condition = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.database.client
      .select({ count: count() })
      .from(licenseDiscountRules)
      .where(condition);
    const total = Number(countResult?.count || 0);

    let query = this.database.client
      .select()
      .from(licenseDiscountRules)
      .where(condition)
      .$dynamic();

    if (sortBy && sortOrder) {
      const orderFn = sortOrder === "asc" ? asc : desc;
      if (sortBy === "name") {
        query = query.orderBy(orderFn(licenseDiscountRules.name));
      } else if (sortBy === "discountValue") {
        query = query.orderBy(orderFn(licenseDiscountRules.discountValue));
      } else if (sortBy === "createdAt") {
        query = query.orderBy(orderFn(licenseDiscountRules.createdAt));
      }
    } else {
      query = query.orderBy(desc(licenseDiscountRules.createdAt));
    }

    query = query.limit(limit).offset((page - 1) * limit);

    const rules = await query;
    return { rules, total };
  }

  async findDiscountRuleTargets(
    input: FindDiscountRuleTargetsRepoInput,
  ): Promise<FindDiscountRuleTargetsRepoResult> {
    const result: FindDiscountRuleTargetsRepoResult = new Map();
    if (input.ruleIds.length === 0) return result;

    if (
      input.targetEntity ===
      LicenseDiscountRuleTargetEntityTypeEnum.RESELLER_INDIVIDUAL
    ) {
      const rows = await this.database.client
        .select({
          discountRuleId: resellerDiscountRuleMapper.discountRuleId,
          id: users.id,
          name: users.name,
        })
        .from(resellerDiscountRuleMapper)
        .innerJoin(users, eq(resellerDiscountRuleMapper.resellerId, users.id))
        .where(
          inArray(resellerDiscountRuleMapper.discountRuleId, input.ruleIds),
        );

      for (const row of rows) {
        const existing = result.get(row.discountRuleId) ?? [];
        existing.push({ id: row.id, name: row.name });
        result.set(row.discountRuleId, existing);
      }
      return result;
    }

    if (
      input.targetEntity ===
      LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL
    ) {
      const rows = await this.database.client
        .select({
          discountRuleId: licensePricingDiscountRuleMapper.discountRuleId,
          id: licensePricing.id,
          name: licensePricing.name,
        })
        .from(licensePricingDiscountRuleMapper)
        .innerJoin(
          licensePricing,
          eq(licensePricingDiscountRuleMapper.pricingId, licensePricing.id),
        )
        .where(
          inArray(
            licensePricingDiscountRuleMapper.discountRuleId,
            input.ruleIds,
          ),
        );

      for (const row of rows) {
        const existing = result.get(row.discountRuleId) ?? [];
        existing.push({ id: row.id, name: row.name });
        result.set(row.discountRuleId, existing);
      }
      return result;
    }

    return result;
  }

  async createDiscountRuleWithTargets(
    input: CreateDiscountRuleWithTargetsRepoInput,
  ): Promise<CreateDiscountRuleWithTargetsRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [rule] = await tx
        .insert(licenseDiscountRules)
        .values({
          name: input.name,
          targetEntity: input.targetEntity,
          discountType: input.discountType,
          discountValue: String(input.discountValue),
          minQuantity: input.minQuantity,
          maxQuantity: input.maxQuantity ?? null,
          startsAt: input.startsAt ?? null,
          endsAt: input.endsAt ?? null,
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        })
        .returning();

      if (!rule) throw new Error("Failed to create discount rule");

      if (
        input.targetEntity ===
          LicenseDiscountRuleTargetEntityTypeEnum.RESELLER_INDIVIDUAL &&
        input.resellerIds &&
        input.resellerIds.length > 0
      ) {
        await tx.insert(resellerDiscountRuleMapper).values(
          input.resellerIds.map((resellerId) => ({
            resellerId,
            discountRuleId: rule.id,
            createdBy: input.createdBy,
            updatedBy: input.createdBy,
          })),
        );
      }

      if (
        input.targetEntity ===
          LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL &&
        input.pricingPlanIds &&
        input.pricingPlanIds.length > 0
      ) {
        await tx.insert(licensePricingDiscountRuleMapper).values(
          input.pricingPlanIds.map((pricingId) => ({
            pricingId,
            discountRuleId: rule.id,
            createdBy: input.createdBy,
            updatedBy: input.createdBy,
          })),
        );
      }

      return rule;
    });
  }

  async updateDiscountRule(
    input: UpdateDiscountRuleRepoInput,
  ): Promise<UpdateDiscountRuleRepoResult> {
    const [updated] = await this.database.client
      .update(licenseDiscountRules)
      .set({
        ...input.data,
        updatedBy: input.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(licenseDiscountRules.id, input.ruleId))
      .returning();

    if (!updated) throw new Error("Discount rule not found");
    return updated;
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

  // ========================================
  // ? LICENSE TRANSACTION ITEM SCHEMA METHODS
  // ========================================
  async findOneLatestPurchaseItem(licenseId: string) {
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

  // ========================================
  // ? LICENSE HISTORY SCHEMA METHODS
  // ========================================
  async findHistory(
    input: FindLicenseHistoryRepoInput,
  ): Promise<FindLicenseHistoryRepoResult> {
    const rows = await this.database.client
      .select({
        id: licenseHistory.id,
        licenseId: licenseHistory.licenseId,
        eventType: licenseHistory.eventType,
        targetEntityType: licenseHistory.targetEntityType,
        previousStatus: licenseHistory.previousStatus,
        newStatus: licenseHistory.newStatus,
        previousExpiresAt: licenseHistory.previousExpiresAt,
        newExpiresAt: licenseHistory.newExpiresAt,
        transactionId: licenseHistory.transactionId,
        remarks: licenseHistory.remarks,
        performedBy: licenseHistory.performedBy,
        performedByName: users.name,
        performedByEmail: users.email,
        createdAt: licenseHistory.createdAt,
      })
      .from(licenseHistory)
      .leftJoin(users, eq(licenseHistory.performedBy, users.id))
      .where(eq(licenseHistory.licenseId, input.licenseId))
      .orderBy(desc(licenseHistory.createdAt));

    return rows;
  }

  async createHistory(
    input: CreateLicenseHistoryRepoInput,
  ): Promise<CreateLicenseHistoryRepoResult> {
    await this.database.client.insert(licenseHistory).values({
      licenseId: input.licenseId,
      eventType: input.eventType,
      targetEntityType: input.targetEntityType,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      previousExpiresAt: input.previousExpiresAt,
      newExpiresAt: input.newExpiresAt,
      performedBy: input.performedBy || null,
      remarks: input.remarks || null,
    });
  }
}
