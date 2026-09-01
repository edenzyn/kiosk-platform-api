import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../../../config/db";
import { LicenseHistoryEventTypeEnum } from "../../../shared/enums/license/license-history-event-type.enum";
import { LicenseHistoryTargetEntityTypeEnum } from "../../../shared/enums/license/license-history-target-entity-type.enum";
import { LicenseRedemptionStatusEnum } from "../../../shared/enums/license/license-redemption-status.enum";
import { LicenseStatusEnum } from "../../../shared/enums/license/license-status.enum";
import { LicenseTransactionActionTypeEnum } from "../../../shared/enums/license/license-transaction-action-type.enum";
import { branches } from "../../branch/branch.schema";
import { devices } from "../../device/device.schema";
import { organizations } from "../../organization/organization.schema";
import type { LicenseWithDetails } from "../dtos/get-licenses.dtos";
import type {
  ClaimRedemptionCodeRepoInput,
  ClaimRedemptionCodeRepoResult,
  CreateRedemptionCodeRepoInput,
  CreateRedemptionCodeRepoResult,
  FindAvailableLicensesForRedemptionRepoInput,
  FindAvailableLicensesForRedemptionRepoResult,
  FindLicenseIdsWithActiveRedemptionRepoInput,
  FindLicenseIdsWithActiveRedemptionRepoResult,
  FindRedemptionCodeByHashRepoInput,
  FindRedemptionCodeByHashRepoResult,
  FindRedemptionCodeByIdRepoInput,
  FindRedemptionCodeByIdRepoResult,
  FindRedemptionCodeDetailsByIdRepoInput,
  FindRedemptionCodeDetailsByIdRepoResult,
  FindRedemptionCodesByResellerRepoInput,
  FindRedemptionCodesByResellerRepoResult,
  FindRedemptionPricingForLicenseRepoResult,
  RevokeRedemptionCodeRepoInput,
  RevokeRedemptionCodeRepoResult,
  VerifyRedemptionCodeRepoInput,
  VerifyRedemptionCodeRepoResult,
} from "../license.types";
import { licenseHistory } from "../schemas/license-history.schema";
import { licensePricing } from "../schemas/license-pricing.schema";
import { licenseRedemptionCodes } from "../schemas/license-redemption-code.schema";
import { licenseRedemptionItems } from "../schemas/license-redemption-item.schema";
import { licenseResellerMapper } from "../schemas/license-reseller-mapper.schema";
import { licenseTransactionItems } from "../schemas/license-transaction-item.schema";
import { licenses, type LicenseEntity } from "../schemas/license.schema";

type DbTransaction = Parameters<
  Parameters<Database["client"]["transaction"]>[0]
>[0];

export class LicenseRedemptionRepository {
  constructor(private readonly database: Database) {}

  // True when `licenses.id` has no non-revoked/non-expired redemption item,
  // i.e. it's not already sitting inside an active redemption code. A NOT
  // EXISTS subquery (rather than a LEFT JOIN + IS NULL) so a license with
  // multiple historical redemption items is never duplicated by the caller's
  // outer query.
  private _noActiveRedemptionCondition(): SQL {
    return sql`NOT EXISTS (
      SELECT 1 FROM license_redemption_items lri
      INNER JOIN license_redemption_codes lrc ON lrc.id = lri.redemption_id
      WHERE lri.license_id = ${licenses.id}
        AND lrc.status NOT IN (${LicenseRedemptionStatusEnum.REVOKED}, ${LicenseRedemptionStatusEnum.EXPIRED})
    )`;
  }

  /**
   * Atomically transitions a redemption code's status, guarded by `where`
   * (which must include the current-status check). Returns the updated row,
   * or undefined if nothing matched (already transitioned, wrong owner, etc).
   * Shared by revoke/verify/claim so each only supplies its own WHERE/SET.
   */
  private async _updateRedemptionCodeIfMatching(
    tx: DbTransaction,
    where: SQL,
    set: Partial<typeof licenseRedemptionCodes.$inferInsert>,
  ) {
    const [updated] = await tx
      .update(licenseRedemptionCodes)
      .set({ ...set, updatedAt: new Date() })
      .where(where)
      .returning();

    return updated;
  }

  async findLicenseIdsWithActiveRedemption(
    input: FindLicenseIdsWithActiveRedemptionRepoInput,
  ): Promise<FindLicenseIdsWithActiveRedemptionRepoResult> {
    if (input.licenseIds.length === 0) return [];

    const rows = await this.database.client
      .select({ licenseId: licenseRedemptionItems.licenseId })
      .from(licenseRedemptionItems)
      .innerJoin(
        licenseRedemptionCodes,
        eq(licenseRedemptionItems.redemptionId, licenseRedemptionCodes.id),
      )
      .where(
        and(
          inArray(licenseRedemptionItems.licenseId, input.licenseIds),
          notInArray(licenseRedemptionCodes.status, [
            LicenseRedemptionStatusEnum.REVOKED,
            LicenseRedemptionStatusEnum.EXPIRED,
          ]),
        ),
      );

    return rows.map((row) => row.licenseId);
  }

  async findRedemptionPricingForLicense(
    licenseId: string,
  ): Promise<FindRedemptionPricingForLicenseRepoResult | null> {
    const [row] = await this.database.client
      .select({
        pricingId: licenseRedemptionItems.pricingId,
        planName: licensePricing.name,
        basePrice: licenseRedemptionItems.basePrice,
        basePriceCurrency: licenseRedemptionItems.basePriceCurrency,
        soldPrice: licenseRedemptionItems.soldPrice,
        soldPriceCurrency: licenseRedemptionCodes.soldPriceCurrency,
        durationDays: licenseRedemptionItems.durationDays,
      })
      .from(licenseRedemptionItems)
      .innerJoin(
        licenseRedemptionCodes,
        eq(licenseRedemptionCodes.id, licenseRedemptionItems.redemptionId),
      )
      .leftJoin(
        licensePricing,
        eq(licensePricing.id, licenseRedemptionItems.pricingId),
      )
      .where(
        and(
          eq(licenseRedemptionItems.licenseId, licenseId),
          inArray(licenseRedemptionCodes.status, [
            LicenseRedemptionStatusEnum.CLAIMED,
            LicenseRedemptionStatusEnum.VERIFIED,
          ]),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async findAvailableLicensesForRedemption(
    input: FindAvailableLicensesForRedemptionRepoInput,
  ): Promise<FindAvailableLicensesForRedemptionRepoResult> {
    const { resellerId, page = 1, limit = 10 } = input;

    const condition = and(
      eq(licenseResellerMapper.resellerId, resellerId),
      eq(licenseResellerMapper.isActive, true),
      eq(licenses.status, LicenseStatusEnum.AVAILABLE),
      this._noActiveRedemptionCondition(),
    );

    const [countResult] = await this.database.client
      .select({ count: count() })
      .from(licenseResellerMapper)
      .innerJoin(licenses, eq(licenseResellerMapper.licenseId, licenses.id))
      .where(condition);
    const total = Number(countResult?.count || 0);

    const rows = await this.database.client
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
      .orderBy(desc(licenses.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return { licenses: rows as LicenseWithDetails[], total };
  }

  async createRedemptionCode(
    input: CreateRedemptionCodeRepoInput,
  ): Promise<CreateRedemptionCodeRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const [insertedCode] = await tx
        .insert(licenseRedemptionCodes)
        .values({
          resellerId: input.resellerId,
          redeemCode: input.redeemCode,
          redeemCodeHash: input.redeemCodeHash,
          status: input.status,
          redeemExpiresAt: input.redeemExpiresAt,
          remarks: input.remarks,
          createdBy: input.createdBy,
          updatedBy: input.updatedBy,
        })
        .returning();

      if (!insertedCode) {
        throw new Error("Failed to create redemption code");
      }

      const insertedItems = await tx
        .insert(licenseRedemptionItems)
        .values(
          input.items.map((item) => ({
            redemptionId: insertedCode.id,
            licenseId: item.licenseId,
            pricingId: item.pricingId,
            basePrice: item.basePrice,
            soldPrice: item.soldPrice,
            basePriceCurrency: item.basePriceCurrency,
            durationDays: item.durationDays,
          })),
        )
        .returning();

      for (const item of input.items) {
        await tx.insert(licenseHistory).values({
          licenseId: item.licenseId,
          eventType: LicenseHistoryEventTypeEnum.REDEMPTION_CODE_GENERATED,
          targetEntityType: LicenseHistoryTargetEntityTypeEnum.RESELLER,
          performedBy: input.createdBy,
          remarks: "Redemption code generated",
        });
      }

      const { redeemCodeHash: _redeemCodeHash, ...codeWithoutHash } =
        insertedCode;
      return { ...codeWithoutHash, items: insertedItems };
    });
  }

  async findRedemptionCodesByReseller(
    input: FindRedemptionCodesByResellerRepoInput,
  ): Promise<FindRedemptionCodesByResellerRepoResult> {
    const {
      resellerId,
      page = 1,
      limit = 10,
      status,
      sortBy,
      sortOrder,
    } = input;

    const conditions = [eq(licenseRedemptionCodes.resellerId, resellerId)];
    if (status !== undefined && status !== null) {
      conditions.push(eq(licenseRedemptionCodes.status, status));
    }
    if (input.search) {
      conditions.push(
        ilike(licenseRedemptionCodes.remarks, `%${input.search}%`),
      );
    }
    const condition = and(...conditions);

    const [countResult] = await this.database.client
      .select({ count: count() })
      .from(licenseRedemptionCodes)
      .where(condition);
    const total = Number(countResult?.count || 0);

    let query = this.database.client
      .select({
        code: {
          id: licenseRedemptionCodes.id,
          resellerId: licenseRedemptionCodes.resellerId,
          redeemCode: licenseRedemptionCodes.redeemCode,
          status: licenseRedemptionCodes.status,
          soldPrice: licenseRedemptionCodes.soldPrice,
          soldPriceCurrency: licenseRedemptionCodes.soldPriceCurrency,
          generatedAt: licenseRedemptionCodes.generatedAt,
          redeemExpiresAt: licenseRedemptionCodes.redeemExpiresAt,
          claimedAt: licenseRedemptionCodes.claimedAt,
          claimedByOrganizationId:
            licenseRedemptionCodes.claimedByOrganizationId,
          claimedByUserId: licenseRedemptionCodes.claimedByUserId,
          remarks: licenseRedemptionCodes.remarks,
          createdAt: licenseRedemptionCodes.createdAt,
          updatedAt: licenseRedemptionCodes.updatedAt,
          createdBy: licenseRedemptionCodes.createdBy,
          updatedBy: licenseRedemptionCodes.updatedBy,
        },
        itemCount: count(licenseRedemptionItems.id),
      })
      .from(licenseRedemptionCodes)
      .leftJoin(
        licenseRedemptionItems,
        eq(licenseRedemptionItems.redemptionId, licenseRedemptionCodes.id),
      )
      .where(condition)
      .groupBy(licenseRedemptionCodes.id)
      .$dynamic();

    if (sortBy && sortOrder) {
      const orderFn = sortOrder === "asc" ? asc : desc;
      if (sortBy === "status") {
        query = query.orderBy(orderFn(licenseRedemptionCodes.status));
      } else if (sortBy === "redeemExpiresAt") {
        query = query.orderBy(orderFn(licenseRedemptionCodes.redeemExpiresAt));
      } else if (sortBy === "generatedAt") {
        query = query.orderBy(orderFn(licenseRedemptionCodes.generatedAt));
      }
    } else {
      query = query.orderBy(desc(licenseRedemptionCodes.generatedAt));
    }

    if (page && limit) {
      query = query.limit(limit).offset((page - 1) * limit);
    }

    const rows = await query;

    return {
      redemptionCodes: rows.map((row) => ({
        ...row.code,
        itemCount: Number(row.itemCount),
      })),
      total,
    };
  }

  async findRedemptionCodeById(
    input: FindRedemptionCodeByIdRepoInput,
  ): Promise<FindRedemptionCodeByIdRepoResult> {
    const [code] = await this.database.client
      .select()
      .from(licenseRedemptionCodes)
      .where(
        and(
          eq(licenseRedemptionCodes.id, input.id),
          eq(licenseRedemptionCodes.resellerId, input.resellerId),
        ),
      )
      .limit(1);

    if (!code) return null;

    const items = await this.database.client
      .select()
      .from(licenseRedemptionItems)
      .where(eq(licenseRedemptionItems.redemptionId, code.id));

    return { ...code, items };
  }

  async findRedemptionCodeDetailsById(
    input: FindRedemptionCodeDetailsByIdRepoInput,
  ): Promise<FindRedemptionCodeDetailsByIdRepoResult | null> {
    const [code] = await this.database.client
      .select({
        id: licenseRedemptionCodes.id,
        resellerId: licenseRedemptionCodes.resellerId,
        redeemCode: licenseRedemptionCodes.redeemCode,
        status: licenseRedemptionCodes.status,
        soldPrice: licenseRedemptionCodes.soldPrice,
        soldPriceCurrency: licenseRedemptionCodes.soldPriceCurrency,
        generatedAt: licenseRedemptionCodes.generatedAt,
        redeemExpiresAt: licenseRedemptionCodes.redeemExpiresAt,
        claimedAt: licenseRedemptionCodes.claimedAt,
        claimedByOrganizationId: licenseRedemptionCodes.claimedByOrganizationId,
        claimedByUserId: licenseRedemptionCodes.claimedByUserId,
        remarks: licenseRedemptionCodes.remarks,
        createdAt: licenseRedemptionCodes.createdAt,
        updatedAt: licenseRedemptionCodes.updatedAt,
        createdBy: licenseRedemptionCodes.createdBy,
        updatedBy: licenseRedemptionCodes.updatedBy,
      })
      .from(licenseRedemptionCodes)
      .where(
        and(
          eq(licenseRedemptionCodes.id, input.id),
          eq(licenseRedemptionCodes.resellerId, input.resellerId),
        ),
      )
      .limit(1);

    if (!code) return null;

    const items = await this.database.client
      .select({
        id: licenseRedemptionItems.id,
        redemptionId: licenseRedemptionItems.redemptionId,
        licenseId: licenseRedemptionItems.licenseId,
        pricingId: licenseRedemptionItems.pricingId,
        basePrice: licenseRedemptionItems.basePrice,
        soldPrice: licenseRedemptionItems.soldPrice,
        basePriceCurrency: licenseRedemptionItems.basePriceCurrency,
        durationDays: licenseRedemptionItems.durationDays,
        createdAt: licenseRedemptionItems.createdAt,
        licenseKey: licenses.licenseKey,
      })
      .from(licenseRedemptionItems)
      .innerJoin(licenses, eq(licenseRedemptionItems.licenseId, licenses.id))
      .where(eq(licenseRedemptionItems.redemptionId, code.id));

    return { code, items };
  }

  async verifyRedemptionCode(
    input: VerifyRedemptionCodeRepoInput,
  ): Promise<VerifyRedemptionCodeRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const verified = await this._updateRedemptionCodeIfMatching(
        tx,
        and(
          eq(licenseRedemptionCodes.id, input.id),
          eq(licenseRedemptionCodes.resellerId, input.resellerId),
          eq(
            licenseRedemptionCodes.status,
            LicenseRedemptionStatusEnum.CLAIMED,
          ),
        ) as SQL,
        {
          status: LicenseRedemptionStatusEnum.VERIFIED,
          soldPrice: input.totalSoldPrice,
          soldPriceCurrency: input.soldPriceCurrency,
        },
      );

      if (!verified) return false;

      for (const item of input.items) {
        await tx
          .update(licenseRedemptionItems)
          .set({ soldPrice: item.soldPrice })
          .where(
            and(
              eq(licenseRedemptionItems.redemptionId, verified.id),
              eq(licenseRedemptionItems.licenseId, item.licenseId),
            ),
          );

        await tx.insert(licenseHistory).values({
          licenseId: item.licenseId,
          eventType: LicenseHistoryEventTypeEnum.REDEMPTION_VERIFIED,
          targetEntityType: LicenseHistoryTargetEntityTypeEnum.RESELLER,
          remarks: "Redemption sold price verified",
        });
      }

      return true;
    });
  }

  async revokeRedemptionCode(
    input: RevokeRedemptionCodeRepoInput,
  ): Promise<RevokeRedemptionCodeRepoResult> {
    return this.database.client.transaction(async (tx) => {
      const revoked = await this._updateRedemptionCodeIfMatching(
        tx,
        and(
          eq(licenseRedemptionCodes.id, input.id),
          eq(licenseRedemptionCodes.resellerId, input.resellerId),
          eq(
            licenseRedemptionCodes.status,
            LicenseRedemptionStatusEnum.GENERATED,
          ),
        ) as SQL,
        { status: LicenseRedemptionStatusEnum.REVOKED },
      );

      if (!revoked) return undefined;

      const items = await tx
        .select({ licenseId: licenseRedemptionItems.licenseId })
        .from(licenseRedemptionItems)
        .where(eq(licenseRedemptionItems.redemptionId, revoked.id));

      for (const item of items) {
        await tx.insert(licenseHistory).values({
          licenseId: item.licenseId,
          eventType: LicenseHistoryEventTypeEnum.REDEEM_CODE_REVOKED,
          targetEntityType: LicenseHistoryTargetEntityTypeEnum.RESELLER,
          remarks: "Redemption code revoked",
        });
      }

      return revoked;
    });
  }

  async findRedemptionCodeByHash(
    input: FindRedemptionCodeByHashRepoInput,
  ): Promise<FindRedemptionCodeByHashRepoResult> {
    const [code] = await this.database.client
      .select()
      .from(licenseRedemptionCodes)
      .where(eq(licenseRedemptionCodes.redeemCodeHash, input.redeemCodeHash))
      .limit(1);

    return code || null;
  }

  async claimRedemptionCode(
    input: ClaimRedemptionCodeRepoInput,
  ): Promise<ClaimRedemptionCodeRepoResult> {
    return this.database.client
      .transaction(async (tx): Promise<ClaimRedemptionCodeRepoResult> => {
        const claimed = await this._updateRedemptionCodeIfMatching(
          tx,
          and(
            eq(licenseRedemptionCodes.redeemCodeHash, input.redeemCodeHash),
            eq(
              licenseRedemptionCodes.status,
              LicenseRedemptionStatusEnum.GENERATED,
            ),
            or(
              isNull(licenseRedemptionCodes.redeemExpiresAt),
              gt(licenseRedemptionCodes.redeemExpiresAt, new Date()),
            ),
          ) as SQL,
          {
            status: LicenseRedemptionStatusEnum.CLAIMED,
            claimedAt: new Date(),
            claimedByOrganizationId: input.organizationId,
            claimedByUserId: input.claimedByUserId,
          },
        );

        if (!claimed) return { ok: false, reason: "not_claimable" };

        const items = await tx
          .select({ licenseId: licenseRedemptionItems.licenseId })
          .from(licenseRedemptionItems)
          .where(eq(licenseRedemptionItems.redemptionId, claimed.id));

        const claimedLicenses: LicenseEntity[] = [];
        for (const item of items) {
          const [updatedLicense] = await tx
            .update(licenses)
            .set({
              organizationId: input.organizationId,
              branchId: input.branchId,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(licenses.id, item.licenseId),
                eq(licenses.status, LicenseStatusEnum.AVAILABLE),
              ),
            )
            .returning();

          if (!updatedLicense) {
            throw new Error("LICENSES_UNAVAILABLE");
          }
          claimedLicenses.push(updatedLicense);
        }

        await tx
          .update(licenseResellerMapper)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            inArray(
              licenseResellerMapper.licenseId,
              items.map((item) => item.licenseId),
            ),
          );

        for (const license of claimedLicenses) {
          await tx.insert(licenseHistory).values({
            licenseId: license.id,
            eventType: LicenseHistoryEventTypeEnum.REDEEMED,
            targetEntityType: LicenseHistoryTargetEntityTypeEnum.COMMON,
            previousStatus: LicenseStatusEnum.AVAILABLE,
            newStatus: LicenseStatusEnum.AVAILABLE,
            performedBy: input.claimedByUserId,
            remarks: "License redeemed via redemption code",
          });
        }

        return { ok: true, licenses: claimedLicenses };
      })
      .catch((error) => {
        if (
          error instanceof Error &&
          error.message === "LICENSES_UNAVAILABLE"
        ) {
          return { ok: false, reason: "licenses_unavailable" };
        }
        throw error;
      });
  }
}
