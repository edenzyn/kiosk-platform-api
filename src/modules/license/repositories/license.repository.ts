import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../../../config/db";
import { LicenseHistoryEventTypeEnum } from "../../../shared/enums/license/license-history-event-type.enum";
import { LicenseHistoryTargetEntityTypeEnum } from "../../../shared/enums/license/license-history-target-entity-type.enum";
import { LicenseStatusEnum } from "../../../shared/enums/license/license-status.enum";
import { LicenseTransactionActionTypeEnum } from "../../../shared/enums/license/license-transaction-action-type.enum";
import { branches } from "../../branch/branch.schema";
import { devices } from "../../device/device.schema";
import { organizations } from "../../organization/organization.schema";
import type { LicenseWithDetails } from "../dtos/get-licenses.dtos";
import type {
  ActivateLicenseRepoInput,
  ActivateLicenseRepoResult,
  CreateLicenseHistoryRepoInput,
  CreateLicenseHistoryRepoResult,
  CreateLicensesRepoInput,
  CreateLicensesRepoResult,
  ExtendLicenseRepoInput,
  ExtendLicenseRepoResult,
  FindLatestPurchaseSnapshotRepoResult,
  FindLicenseHistoryRepoInput,
  FindLicenseHistoryRepoResult,
  FindLicensesByResellerRepoInput,
  FindLicensesByResellerRepoResult,
  FindLicensesForStatusCheckRepoInput,
  FindLicensesForStatusCheckRepoResult,
  FindLicensesRepoInput,
  FindLicensesRepoResult,
  FindLicenseTransactionsRepoInput,
  FindLicenseTransactionsRepoResult,
  FindOneActiveLicenseByDeviceIdRepoInput,
  FindOneActiveLicenseByDeviceIdRepoResult,
  FindOneLicenseDetailsRepoInput,
  FindOneLicenseDetailsRepoResult,
  FindOneLicenseRepoInput,
  FindOneLicenseRepoResult,
  FindOwnedAvailableLicensesRepoInput,
  FindOwnedAvailableLicensesRepoResult,
  IsLicenseOwnedByResellerRepoInput,
  IsLicenseOwnedByResellerRepoResult,
  UpdateLicenseRepoInput,
  UpdateLicenseRepoResult,
} from "../license.types";
import { licenseHistory } from "../schemas/license-history.schema";
import { licenseResellerMapper } from "../schemas/license-reseller-mapper.schema";
import { licenseTransactionItems } from "../schemas/license-transaction-item.schema";
import { licenseTransactions } from "../schemas/license-transaction.schema";
import { licenses } from "../schemas/license.schema";

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
    const result = await this.database.client.execute<
      NonNullable<FindOneLicenseDetailsRepoResult>
    >(
      sql`SELECT * FROM fn_get_license_details_by_user_type(${input.licenseId}, ${input.viewerUserType})`,
    );

    return result.rows[0] || null;
  }

  async findLicenseTransactions(
    input: FindLicenseTransactionsRepoInput,
  ): Promise<FindLicenseTransactionsRepoResult> {
    const result = await this.database.client.execute<
      FindLicenseTransactionsRepoResult[number]
    >(
      sql`SELECT * FROM fn_get_license_transactions_by_user_type(${input.licenseId}, ${input.viewerUserType})`,
    );

    return result.rows;
  }

  async find(input: FindLicensesRepoInput): Promise<FindLicensesRepoResult> {
    const {
      organizationId,
      branchId,
      page = 1,
      limit = 10,
      search,
      status,
      deviceType,
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

    if (deviceType !== undefined && deviceType !== null) {
      conditions.push(eq(licenses.deviceType, deviceType));
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
        deviceType: licenses.deviceType,
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
      deviceType,
      sortBy,
      sortOrder,
    } = input;

    const conditions = [eq(licenseResellerMapper.resellerId, resellerId)];

    if (status !== undefined && status !== null) {
      conditions.push(eq(licenses.status, status));
    }

    if (deviceType !== undefined && deviceType !== null) {
      conditions.push(eq(licenses.deviceType, deviceType));
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
        deviceType: licenses.deviceType,
        status: licenses.status,
        activatedAt: licenses.activatedAt,
        expiresAt: licenses.expiresAt,
        createdAt: licenses.createdAt,
        updatedAt: licenses.updatedAt,
        durationDays: licenseTransactionItems.durationDays,
      })
      .from(licenseResellerMapper)
      .innerJoin(licenses, eq(licenseResellerMapper.licenseId, licenses.id))
      .leftJoin(organizations, eq(licenses.organizationId, organizations.id))
      .leftJoin(branches, eq(licenses.branchId, branches.id))
      .leftJoin(devices, eq(licenses.deviceId, devices.id))
      .leftJoin(
        licenseTransactionItems,
        and(
          eq(licenseTransactionItems.licenseId, licenses.id),
          eq(
            licenseTransactionItems.actionType,
            LicenseTransactionActionTypeEnum.PURCHASE,
          ),
        ),
      )
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
        ),
      )
      .limit(1);

    return !!mapping;
  }

  async findOwnedAvailableLicenses(
    input: FindOwnedAvailableLicensesRepoInput,
  ): Promise<FindOwnedAvailableLicensesRepoResult> {
    if (input.licenseIds.length === 0) return [];

    const rows = await this.database.client
      .select({ license: licenses })
      .from(licenseResellerMapper)
      .innerJoin(licenses, eq(licenseResellerMapper.licenseId, licenses.id))
      .where(
        and(
          eq(licenseResellerMapper.resellerId, input.resellerId),
          eq(licenseResellerMapper.isActive, true),
          inArray(licenses.id, input.licenseIds),
          eq(licenses.status, LicenseStatusEnum.AVAILABLE),
        ),
      );

    return rows.map((row) => row.license);
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
            paymentProvider: input.transaction!.paymentProvider,
            paymentReference: input.transaction!.paymentReference,
            paymentProviderOrderId: input.transaction!.paymentProviderOrderId,
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
                input.historyTargetEntityType ??
                LicenseHistoryTargetEntityTypeEnum.NORMAL,
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

  async findLatestPurchaseSnapshot(
    licenseId: string,
  ): Promise<FindLatestPurchaseSnapshotRepoResult> {
    const [item] = await this.database.client
      .select({
        durationDays: licenseTransactionItems.durationDays,
        baseUnitPrice: licenseTransactionItems.baseUnitPrice,
        currency: licenseTransactions.currency,
      })
      .from(licenseTransactionItems)
      .innerJoin(
        licenseTransactions,
        eq(licenseTransactionItems.transactionId, licenseTransactions.id),
      )
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
    const targetEntityTypesArrayLiteral = `{${input.targetEntityTypes.join(",")}}`;

    const result = await this.database.client.execute<
      FindLicenseHistoryRepoResult[number]
    >(
      sql`SELECT * FROM fn_get_license_history_by_user_type(${input.licenseId}, ${targetEntityTypesArrayLiteral}::smallint[], ${input.viewerType})`,
    );

    return result.rows;
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
