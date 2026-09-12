import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "../../../config/db";
import { LicenseHistoryEventTypeEnum } from "../../../shared/enums/license/license-history-event-type.enum";
import { LicenseHistoryTargetEntityTypeEnum } from "../../../shared/enums/license/license-history-target-entity-type.enum";
import { LicenseTransactionTypeEnum } from "../../../shared/enums/license/license-transaction-type.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import { markets } from "../../market/schemas/market.schema";
import { licenseResellerMapper } from "../../reseller/schemas/license-reseller-mapper.schema";
import { users } from "../../user/schemas/user.schema";
import type {
  CancelPendingLicenseTransactionRepoInput,
  CancelPendingLicenseTransactionRepoResult,
  CreatePendingLicenseTransactionRepoInput,
  CreatePendingLicenseTransactionRepoResult,
  FinalizeLicenseExtendRepoInput,
  FinalizeLicenseExtendRepoResult,
  FinalizeLicensePurchaseRepoInput,
  FinalizeLicensePurchaseRepoResult,
  FindLicenseTransactionsForOrganizationRepoInput,
  FindLicenseTransactionsForOrganizationRepoResult,
  FindLicenseTransactionsForResellerRepoInput,
  FindLicenseTransactionsForResellerRepoResult,
  FindTransactionsForLicenseRepoInput,
  FindTransactionsForLicenseRepoResult,
  FindTransactionWithItemsRepoInput,
  FindTransactionWithItemsRepoResult,
  UpdateTransactionStatusByOrderIdRepoInput,
  UpdateTransactionStatusByOrderIdRepoResult,
} from "../license.types";
import { licenseHistory } from "../schemas/license-history.schema";
import { licenseTransactionItems } from "../schemas/license-transaction-item.schema";
import { licenseTransactionTaxes } from "../schemas/license-transaction-tax.schema";
import { licenseTransactions } from "../schemas/license-transaction.schema";
import { licenses } from "../schemas/license.schema";

export class LicenseTransactionRepository {
  constructor(private readonly database: Database) {}

  async findTransactionsForLicense(
    input: FindTransactionsForLicenseRepoInput,
  ): Promise<FindTransactionsForLicenseRepoResult> {
    const transactionTypes =
      input.viewerUserType === UserTypeEnums.RESELLER
        ? [
            LicenseTransactionTypeEnum.RESELLER_PURCHASE,
            LicenseTransactionTypeEnum.RENEWAL,
          ]
        : [
            LicenseTransactionTypeEnum.ORGANIZATION_PURCHASE,
            LicenseTransactionTypeEnum.RENEWAL,
          ];

    const performedByName =
      input.viewerUserType === UserTypeEnums.RESELLER
        ? sql<
            string | null
          >`case when ${eq(licenseTransactionItems.transactionType, LicenseTransactionTypeEnum.RESELLER_PURCHASE)} then null else ${users.name} end`
        : users.name;

    return this.database.client
      .select({
        id: licenseTransactionItems.id,
        transactionId: licenseTransactionItems.transactionId,
        planId: licenseTransactionItems.planId,
        planName: licenseTransactionItems.planName,
        transactionType: licenseTransactionItems.transactionType,
        durationDays: licenseTransactionItems.durationDays,
        baseUnitPrice: licenseTransactionItems.baseUnitPrice,
        discountAmount: licenseTransactionItems.discountAmount,
        finalUnitPrice: licenseTransactionItems.finalUnitPrice,
        createdAt: licenseTransactionItems.createdAt,
        paymentStatus: licenseTransactions.paymentStatus,
        marketId: licenseTransactions.marketId,
        currencyCode: markets.currencyCode,
        performedByName,
      })
      .from(licenseTransactionItems)
      .innerJoin(
        licenseTransactions,
        eq(licenseTransactions.id, licenseTransactionItems.transactionId),
      )
      .leftJoin(users, eq(users.id, licenseTransactions.createdBy))
      .innerJoin(markets, eq(markets.id, licenseTransactions.marketId))
      .where(
        and(
          eq(licenseTransactionItems.licenseId, input.licenseId),
          inArray(licenseTransactionItems.transactionType, transactionTypes),
        ),
      )
      .orderBy(desc(licenseTransactionItems.createdAt));
  }

  async findTransactionsForOrganization(
    input: FindLicenseTransactionsForOrganizationRepoInput,
  ): Promise<FindLicenseTransactionsForOrganizationRepoResult> {
    const { organizationId, branchId, page = 1, limit = 10 } = input;

    const condition = and(
      eq(licenseTransactions.organizationId, organizationId),
      branchId ? eq(licenseTransactions.branchId, branchId) : undefined,
    );

    const itemCountSubquery = this.database.client
      .select({
        transactionId: licenseTransactionItems.transactionId,
        itemCount: sql<number>`count(*)::int`.as("item_count"),
      })
      .from(licenseTransactionItems)
      .groupBy(licenseTransactionItems.transactionId)
      .as("item_counts");

    const [rows, totalRows] = await Promise.all([
      this.database.client
        .select({
          id: licenseTransactions.id,
          userId: licenseTransactions.createdBy,
          performedByName: users.name,
          subtotalAmount: licenseTransactions.subtotalAmount,
          discountAmount: licenseTransactions.discountAmount,
          discountType: licenseTransactions.discountType,
          discountValue: licenseTransactions.discountValue,
          amountBeforeTax: licenseTransactions.amountBeforeTax,
          taxAmount: licenseTransactions.taxAmount,
          isTaxInclusive: licenseTransactions.isTaxInclusive,
          totalAmount: licenseTransactions.totalAmount,
          marketId: licenseTransactions.marketId,
          currencyCode: markets.currencyCode,
          paymentStatus: licenseTransactions.paymentStatus,
          transactionAt: licenseTransactions.transactionAt,
          createdAt: licenseTransactions.createdAt,
          itemCount: sql<number>`coalesce(${itemCountSubquery.itemCount}, 0)::int`,
        })
        .from(licenseTransactions)
        .leftJoin(users, eq(users.id, licenseTransactions.createdBy))
        .innerJoin(markets, eq(markets.id, licenseTransactions.marketId))
        .leftJoin(
          itemCountSubquery,
          eq(itemCountSubquery.transactionId, licenseTransactions.id),
        )
        .where(condition)
        .orderBy(desc(licenseTransactions.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.database.client
        .select({ total: sql<number>`count(*)::int` })
        .from(licenseTransactions)
        .where(condition),
    ]);

    return {
      transactions: rows,
      total: totalRows[0]?.total ?? 0,
    };
  }

  async findTransactionsForReseller(
    input: FindLicenseTransactionsForResellerRepoInput,
  ): Promise<FindLicenseTransactionsForResellerRepoResult> {
    const { resellerId, page = 1, limit = 10 } = input;

    const condition = and(
      eq(licenseTransactions.createdBy, resellerId),
      inArray(licenseTransactions.transactionType, [
        LicenseTransactionTypeEnum.RESELLER_PURCHASE,
      ]),
    );

    const itemCountSubquery = this.database.client
      .select({
        transactionId: licenseTransactionItems.transactionId,
        itemCount: sql<number>`count(*)::int`.as("item_count"),
      })
      .from(licenseTransactionItems)
      .groupBy(licenseTransactionItems.transactionId)
      .as("item_counts");

    const [rows, totalRows] = await Promise.all([
      this.database.client
        .select({
          id: licenseTransactions.id,
          userId: licenseTransactions.createdBy,
          performedByName: sql<string | null>`null`,
          subtotalAmount: licenseTransactions.subtotalAmount,
          discountAmount: licenseTransactions.discountAmount,
          discountType: licenseTransactions.discountType,
          discountValue: licenseTransactions.discountValue,
          amountBeforeTax: licenseTransactions.amountBeforeTax,
          taxAmount: licenseTransactions.taxAmount,
          isTaxInclusive: licenseTransactions.isTaxInclusive,
          totalAmount: licenseTransactions.totalAmount,
          marketId: licenseTransactions.marketId,
          currencyCode: markets.currencyCode,
          paymentStatus: licenseTransactions.paymentStatus,
          transactionAt: licenseTransactions.transactionAt,
          createdAt: licenseTransactions.createdAt,
          itemCount: sql<number>`coalesce(${itemCountSubquery.itemCount}, 0)::int`,
        })
        .from(licenseTransactions)
        .innerJoin(markets, eq(markets.id, licenseTransactions.marketId))
        .leftJoin(
          itemCountSubquery,
          eq(itemCountSubquery.transactionId, licenseTransactions.id),
        )
        .where(condition)
        .orderBy(desc(licenseTransactions.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.database.client
        .select({ total: sql<number>`count(*)::int` })
        .from(licenseTransactions)
        .where(condition),
    ]);

    return {
      transactions: rows,
      total: totalRows[0]?.total ?? 0,
    };
  }

  async findTransactionWithItems(
    input: FindTransactionWithItemsRepoInput,
  ): Promise<FindTransactionWithItemsRepoResult | null> {
    const accessCondition = input.resellerId
      ? eq(licenseTransactions.createdBy, input.resellerId)
      : and(
          eq(
            licenseTransactions.organizationId,
            input.organizationId as string,
          ),
          input.branchId
            ? eq(licenseTransactions.branchId, input.branchId)
            : undefined,
        );

    const performedByName = input.resellerId
      ? sql<string | null>`null`
      : users.name;

    const [transaction] = await this.database.client
      .select({
        id: licenseTransactions.id,
        userId: licenseTransactions.createdBy,
        performedByName,
        subtotalAmount: licenseTransactions.subtotalAmount,
        discountAmount: licenseTransactions.discountAmount,
        discountType: licenseTransactions.discountType,
        discountValue: licenseTransactions.discountValue,
        amountBeforeTax: licenseTransactions.amountBeforeTax,
        taxAmount: licenseTransactions.taxAmount,
        isTaxInclusive: licenseTransactions.isTaxInclusive,
        totalAmount: licenseTransactions.totalAmount,
        marketId: licenseTransactions.marketId,
        currencyCode: markets.currencyCode,
        paymentStatus: licenseTransactions.paymentStatus,
        paymentProvider: licenseTransactions.paymentProvider,
        paymentReference: licenseTransactions.paymentReference,
        failureReason: licenseTransactions.failureReason,
        transactionAt: licenseTransactions.transactionAt,
        createdAt: licenseTransactions.createdAt,
      })
      .from(licenseTransactions)
      .leftJoin(users, eq(users.id, licenseTransactions.createdBy))
      .innerJoin(markets, eq(markets.id, licenseTransactions.marketId))
      .where(
        and(eq(licenseTransactions.id, input.transactionId), accessCondition),
      )
      .limit(1);

    if (!transaction) return null;

    const [itemRows, taxRows] = await Promise.all([
      this.database.client
        .select({
          id: licenseTransactionItems.id,
          licenseId: licenseTransactionItems.licenseId,
          licenseKey: licenses.licenseKey,
          deviceType: licenses.deviceType,
          planId: licenseTransactionItems.planId,
          planName: licenseTransactionItems.planName,
          transactionType: licenseTransactionItems.transactionType,
          durationDays: licenseTransactionItems.durationDays,
          baseUnitPrice: licenseTransactionItems.baseUnitPrice,
          discountAmount: licenseTransactionItems.discountAmount,
          finalUnitPrice: licenseTransactionItems.finalUnitPrice,
          createdAt: licenseTransactionItems.createdAt,
        })
        .from(licenseTransactionItems)
        .leftJoin(licenses, eq(licenses.id, licenseTransactionItems.licenseId))
        .where(eq(licenseTransactionItems.transactionId, input.transactionId))
        .orderBy(asc(licenseTransactionItems.createdAt)),
      this.database.client
        .select({
          id: licenseTransactionTaxes.id,
          name: licenseTransactionTaxes.taxName,
          rate: licenseTransactionTaxes.taxRate,
          amount: licenseTransactionTaxes.taxAmount,
        })
        .from(licenseTransactionTaxes)
        .where(eq(licenseTransactionTaxes.transactionId, input.transactionId)),
    ]);

    return {
      transaction: {
        ...transaction,
        taxes: taxRows,
      },
      items: itemRows,
    };
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
          marketId: input.marketId,
          transactionType: input.transactionType,
          subtotalAmount: input.subtotalAmount,
          discountAmount: input.discountAmount,
          discountType: input.discountType,
          discountValue: input.discountValue,
          appliedDiscountRuleId: input.appliedDiscountRuleId,
          amountBeforeTax: input.amountBeforeTax,
          taxAmount: input.taxAmount ?? "0",
          isTaxInclusive: input.isTaxInclusive ?? false,
          totalAmount: input.totalAmount,
          paymentStatus: input.paymentStatus,
          paymentProvider: input.paymentProvider,
          paymentProviderOrderId: input.paymentProviderOrderId,
          intentPayload: input.intentPayload,
          billingName: input.billingInfo?.name,
          billingEmail: input.billingInfo?.email,
          billingPhone: input.billingInfo?.phone,
          billingAddress: input.billingInfo?.address,
          billingCity: input.billingInfo?.city,
          billingState: input.billingInfo?.state,
          billingPostalCode: input.billingInfo?.postalCode,
          billingCountry: input.billingInfo?.country,
          billingTaxId: input.billingInfo?.taxId,
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
            planId: item.planId,
            planName: item.planName,
            transactionType: item.transactionType,
            durationDays: item.durationDays,
            baseUnitPrice: item.baseUnitPrice,
            discountAmount: item.discountAmount,
            finalUnitPrice: item.finalUnitPrice,
          })),
        );
      }

      if (input.taxes && input.taxes.length > 0) {
        await tx.insert(licenseTransactionTaxes).values(
          input.taxes.map((tax) => ({
            transactionId: insertedTx.id,
            taxProfileId: tax.taxProfileId,
            taxComponentId: tax.taxComponentId,
            taxName: tax.name,
            taxRate: tax.rate,
            taxAmount: tax.amount,
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
            planId: itemSpec.planId,
            planName: itemSpec.planName,
            transactionType: itemSpec.transactionType,
            durationDays: itemSpec.durationDays,
            baseUnitPrice: itemSpec.baseUnitPrice,
            discountAmount: itemSpec.discountAmount,
            finalUnitPrice: itemSpec.finalUnitPrice,
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
            remarks: "Purchased via license plan",
          });

          if (input.resellerId) {
            await tx.insert(licenseResellerMapper).values({
              licenseId: license.id,
              resellerId: input.resellerId,
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
        planId: input.transactionItem.planId,
        planName: input.transactionItem.planName,
        transactionType: input.transactionItem.transactionType,
        durationDays: input.transactionItem.durationDays,
        baseUnitPrice: input.transactionItem.baseUnitPrice,
        discountAmount: input.transactionItem.discountAmount,
        finalUnitPrice: input.transactionItem.finalUnitPrice,
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
          sql`${licenseTransactionItems.transactionType} IN (${LicenseTransactionTypeEnum.ORGANIZATION_PURCHASE}, ${LicenseTransactionTypeEnum.RESELLER_PURCHASE})`,
        ),
      )
      .orderBy(desc(licenseTransactionItems.createdAt))
      .limit(1);
    return item || null;
  }
}
