import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../../config/db";
import { LicenseHistoryEventTypeEnum } from "../../../shared/enums/license/license-history-event-type.enum";
import { LicenseHistoryTargetEntityTypeEnum } from "../../../shared/enums/license/license-history-target-entity-type.enum";
import { LicenseTransactionTypeEnum } from "../../../shared/enums/license/license-transaction-type.enum";
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
  FindLicenseTransactionsRepoInput,
  FindLicenseTransactionsRepoResult,
  FindTransactionWithItemsRepoInput,
  FindTransactionWithItemsRepoResult,
  LicenseTransactionItemWithHeaderRow,
  LicenseTransactionListRow,
  UpdateTransactionStatusByOrderIdRepoInput,
  UpdateTransactionStatusByOrderIdRepoResult,
} from "../license.types";
import { licenseHistory } from "../schemas/license-history.schema";
import { licenseResellerMapper } from "../../reseller/schemas/license-reseller-mapper.schema";
import { licenseTransactionItems } from "../schemas/license-transaction-item.schema";
import { licenseTransactionTaxes } from "../schemas/license-transaction-tax.schema";
import { licenseTransactions } from "../schemas/license-transaction.schema";
import { licenses } from "../schemas/license.schema";

export class LicenseTransactionRepository {
  constructor(private readonly database: Database) {}

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
        discountAmount: transactionWithItems.transactionDiscountAmount,
        discountType: transactionWithItems.transactionDiscountType,
        discountValue: transactionWithItems.transactionDiscountValue,
        totalAmount: transactionWithItems.totalAmount,
        marketId: transactionWithItems.marketId,
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
          planId: row.planId,
          planName: row.planName,
          transactionType: row.transactionType as number,
          durationDays: row.durationDays as number,
          baseUnitPrice: row.baseUnitPrice as string,
          discountType: row.discountType,
          discountValue: row.discountValue,
          discountAmount: row.discountAmount,
          finalUnitPrice: row.finalUnitPrice as string,
          createdAt: row.itemCreatedAt as string,
        })),
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
          totalAmount: input.totalAmount,
          totalTaxAmount: input.totalTaxAmount ?? "0",
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
            discountType: item.discountType,
            discountValue: item.discountValue,
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
            discountType: itemSpec.discountType,
            discountValue: itemSpec.discountValue,
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
        discountType: input.transactionItem.discountType,
        discountValue: input.transactionItem.discountValue,
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
