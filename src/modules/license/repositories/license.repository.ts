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
  isNull,
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
  CancelPendingLicenseTransactionRepoInput,
  CancelPendingLicenseTransactionRepoResult,
  CreateLicenseHistoryRepoInput,
  CreateLicenseHistoryRepoResult,
  CreatePendingLicenseTransactionRepoInput,
  CreatePendingLicenseTransactionRepoResult,
  FinalizeLicenseExtendRepoInput,
  FinalizeLicenseExtendRepoResult,
  FinalizeLicensePurchaseRepoInput,
  FinalizeLicensePurchaseRepoResult,
  FindLatestPurchaseSnapshotRepoResult,
  FindLicenseHistoryRepoInput,
  FindLicenseHistoryRepoResult,
  FindLicensesByResellerRepoInput,
  FindLicensesByResellerRepoResult,
  FindLicensesForStatusCheckRepoInput,
  FindLicensesForStatusCheckRepoResult,
  FindLicensesRepoInput,
  FindLicensesRepoResult,
  FindLicenseTransactionsForOrganizationRepoInput,
  FindLicenseTransactionsForOrganizationRepoResult,
  FindLicenseTransactionsForResellerRepoInput,
  FindLicenseTransactionsForResellerRepoResult,
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
  FindTransactionWithItemsRepoInput,
  FindTransactionWithItemsRepoResult,
  IsLicenseOwnedByResellerRepoInput,
  IsLicenseOwnedByResellerRepoResult,
  LicenseTransactionItemWithHeaderRow,
  LicenseTransactionListRow,
  UpdateLicenseRepoInput,
  UpdateLicenseRepoResult,
  UpdateTransactionStatusByOrderIdRepoInput,
  UpdateTransactionStatusByOrderIdRepoResult,
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

  async findTransactionsForOrganization(
    input: FindLicenseTransactionsForOrganizationRepoInput,
  ): Promise<FindLicenseTransactionsForOrganizationRepoResult> {
    const { organizationId, branchId, page = 1, limit = 10 } = input;

    const result =
      await this.database.client.execute<LicenseTransactionListRow>(
        sql`SELECT * FROM fn_get_all_license_transactions_by_tenant(${organizationId}, ${branchId ?? null}, ${null}, ${page}, ${limit})`,
      );

    return {
      transactions: result.rows.map(({ totalCount, ...row }) => row),
      total: Number(result.rows[0]?.totalCount || 0),
    };
  }

  async findTransactionsForReseller(
    input: FindLicenseTransactionsForResellerRepoInput,
  ): Promise<FindLicenseTransactionsForResellerRepoResult> {
    const { resellerId, page = 1, limit = 10 } = input;

    const result =
      await this.database.client.execute<LicenseTransactionListRow>(
        sql`SELECT * FROM fn_get_all_license_transactions_by_tenant(${null}, ${null}, ${resellerId}, ${page}, ${limit})`,
      );

    return {
      transactions: result.rows.map(({ totalCount, ...row }) => row),
      total: Number(result.rows[0]?.totalCount || 0),
    };
  }

  async findTransactionWithItems(
    input: FindTransactionWithItemsRepoInput,
  ): Promise<FindTransactionWithItemsRepoResult | null> {
    const result =
      await this.database.client.execute<LicenseTransactionItemWithHeaderRow>(
        sql`SELECT * FROM fn_get_license_transaction_items_by_tenant(${input.transactionId}, ${input.organizationId ?? null}, ${input.branchId ?? null}, ${input.resellerId ?? null})`,
      );

    const [transactionWithItems] = result.rows;
    if (!transactionWithItems) return null;

    return {
      transaction: {
        id: transactionWithItems.transactionId,
        userId: transactionWithItems.userId,
        performedByName: transactionWithItems.performedByName,
        subtotalAmount: transactionWithItems.subtotalAmount,
        discountAmount: transactionWithItems.discountAmount,
        discountPercentage: transactionWithItems.transactionDiscountPercentage,
        totalAmount: transactionWithItems.totalAmount,
        currency: transactionWithItems.currency,
        paymentStatus: transactionWithItems.paymentStatus,
        paymentProvider: transactionWithItems.paymentProvider,
        paymentReference: transactionWithItems.paymentReference,
        failureReason: transactionWithItems.failureReason,
        transactionAt: transactionWithItems.transactionAt,
        createdAt: transactionWithItems.transactionCreatedAt,
      },
      items: result.rows
        .filter(
          (row): row is typeof row & { itemId: string } => row.itemId !== null,
        )
        .map((row) => ({
          id: row.itemId,
          licenseId: row.licenseId,
          licenseKey: row.licenseKey,
          deviceType: row.deviceType,
          pricingPlanId: row.pricingPlanId,
          planName: row.planName,
          actionType: row.actionType as number,
          durationDays: row.durationDays as number,
          baseUnitPrice: row.baseUnitPrice as string,
          discountPercentage: row.discountPercentage,
          unitPrice: row.unitPrice as string,
          createdAt: row.itemCreatedAt as string,
        })),
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

  async createPendingTransaction(
    input: CreatePendingLicenseTransactionRepoInput,
  ): Promise<CreatePendingLicenseTransactionRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [insertedTx] = await tx
        .insert(licenseTransactions)
        .values({
          organizationId: input.organizationId,
          branchId: input.branchId,
          subtotalAmount: input.subtotalAmount,
          discountAmount: input.discountAmount,
          discountPercentage: input.discountPercentage,
          appliedDiscountRuleId: input.appliedDiscountRuleId,
          totalAmount: input.totalAmount,
          currency: input.currency,
          paymentStatus: input.paymentStatus,
          paymentProvider: input.paymentProvider,
          paymentProviderOrderId: input.paymentProviderOrderId,
          intentPayload: input.intentPayload,
          createdBy: input.userId,
          updatedBy: input.userId,
        })
        .returning({ id: licenseTransactions.id });

      if (!insertedTx) {
        throw new Error("Failed to create pending license transaction record");
      }

      if (input.items && input.items.length > 0) {
        await tx.insert(licenseTransactionItems).values(
          input.items.map((item) => ({
            transactionId: insertedTx.id,
            licenseId: null,
            pricingPlanId: item.pricingPlanId,
            planName: item.planName,
            actionType: item.actionType,
            durationDays: item.durationDays,
            baseUnitPrice: item.baseUnitPrice,
            discountPercentage: item.discountPercentage,
            unitPrice: item.unitPrice,
          })),
        );
      }

      return insertedTx;
    });
  }

  async finalizeLicensePurchase(
    input: FinalizeLicensePurchaseRepoInput,
  ): Promise<FinalizeLicensePurchaseRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [finalizedTx] = await tx
        .update(licenseTransactions)
        .set({
          paymentStatus: input.newPaymentStatus,
          paymentReference: input.paymentReference,
          transactionAt: new Date(),
          updatedBy: input.userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(
              licenseTransactions.paymentProviderOrderId,
              input.paymentProviderOrderId,
            ),
            eq(licenseTransactions.createdBy, input.userId),
            eq(licenseTransactions.paymentStatus, input.currentPaymentStatus),
          ),
        )
        .returning();

      if (!finalizedTx) {
        return null;
      }

      const createdLicenses = await tx
        .insert(licenses)
        .values(input.licenses)
        .returning();

      const pendingItems = await tx
        .select({ id: licenseTransactionItems.id })
        .from(licenseTransactionItems)
        .where(
          and(
            eq(licenseTransactionItems.transactionId, finalizedTx.id),
            isNull(licenseTransactionItems.licenseId),
          ),
        )
        .orderBy(asc(licenseTransactionItems.createdAt));

      for (let i = 0; i < createdLicenses.length; i++) {
        const license = createdLicenses[i];
        const pendingItem = pendingItems[i];
        const itemSpec =
          input.transactionItems?.[i] || input.transactionItems?.[0];

        if (license && pendingItem) {
          await tx
            .update(licenseTransactionItems)
            .set({ licenseId: license.id })
            .where(eq(licenseTransactionItems.id, pendingItem.id));
        } else if (license && itemSpec) {
          await tx.insert(licenseTransactionItems).values({
            transactionId: finalizedTx.id,
            licenseId: license.id,
            pricingPlanId: itemSpec.pricingPlanId,
            planName: itemSpec.planName,
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
            transactionId: finalizedTx.id,
            performedBy: input.userId,
            remarks: "Purchased via pricing plan",
          });

          if (input.resellerId) {
            await tx.insert(licenseResellerMapper).values({
              licenseId: license.id,
              resellerId: input.resellerId,
              assignedAt: new Date(),
              isActive: true,
              createdBy: input.userId,
              updatedBy: input.userId,
            });
          }
        }
      }

      return createdLicenses;
    });
  }

  async cancelPendingTransaction(
    input: CancelPendingLicenseTransactionRepoInput,
  ): Promise<CancelPendingLicenseTransactionRepoResult> {
    const [cancelledTx] = await this.database.client
      .update(licenseTransactions)
      .set({
        paymentStatus: input.newPaymentStatus,
        failureReason: input.failureReason,
        updatedBy: input.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            licenseTransactions.paymentProviderOrderId,
            input.paymentProviderOrderId,
          ),
          eq(licenseTransactions.createdBy, input.userId),
          eq(licenseTransactions.paymentStatus, input.currentPaymentStatus),
        ),
      )
      .returning({ id: licenseTransactions.id });

    return !!cancelledTx;
  }

  async updateTransactionStatusByOrderId(
    input: UpdateTransactionStatusByOrderIdRepoInput,
  ): Promise<UpdateTransactionStatusByOrderIdRepoResult> {
    const [updatedTx] = await this.database.client
      .update(licenseTransactions)
      .set({
        paymentStatus: input.newPaymentStatus,
        ...(input.paymentReference != null
          ? { paymentReference: input.paymentReference }
          : {}),
        failureReason: input.failureReason,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            licenseTransactions.paymentProviderOrderId,
            input.paymentProviderOrderId,
          ),
          eq(licenseTransactions.paymentStatus, input.currentPaymentStatus),
        ),
      )
      .returning({ id: licenseTransactions.id });

    return !!updatedTx;
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

  async finalizeLicenseExtend(
    input: FinalizeLicenseExtendRepoInput,
  ): Promise<FinalizeLicenseExtendRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [finalizedTx] = await tx
        .update(licenseTransactions)
        .set({
          paymentStatus: input.newPaymentStatus,
          paymentReference: input.paymentReference,
          transactionAt: new Date(),
          updatedBy: input.userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(
              licenseTransactions.paymentProviderOrderId,
              input.paymentProviderOrderId,
            ),
            eq(licenseTransactions.createdBy, input.userId),
            eq(licenseTransactions.paymentStatus, input.currentPaymentStatus),
          ),
        )
        .returning();

      if (!finalizedTx) {
        return null;
      }

      const [updatedLicense] = await tx
        .update(licenses)
        .set({
          expiresAt: input.newExpiresAt,
          status: input.newStatus,
          updatedAt: new Date(),
          updatedBy: input.userId,
        })
        .where(eq(licenses.id, input.licenseId))
        .returning();

      if (!updatedLicense) {
        throw new Error("Failed to update license");
      }

      await tx.insert(licenseTransactionItems).values({
        transactionId: finalizedTx.id,
        licenseId: input.licenseId,
        pricingPlanId: input.transactionItem.pricingPlanId,
        planName: input.transactionItem.planName,
        actionType: input.transactionItem.actionType,
        durationDays: input.transactionItem.durationDays,
        baseUnitPrice: input.transactionItem.baseUnitPrice,
        discountPercentage: input.transactionItem.discountPercentage,
        unitPrice: input.transactionItem.unitPrice,
      });

      await tx.insert(licenseHistory).values({
        licenseId: input.licenseId,
        eventType: input.historyEvent.eventType,
        targetEntityType: input.historyEvent.targetEntityType,
        previousStatus: input.historyEvent.previousStatus,
        newStatus: input.newStatus,
        previousExpiresAt: input.historyEvent.previousExpiresAt,
        newExpiresAt: input.newExpiresAt,
        transactionId: finalizedTx.id,
        performedBy: input.userId,
        remarks: input.historyEvent.remarks,
      });

      return updatedLicense;
    });
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
