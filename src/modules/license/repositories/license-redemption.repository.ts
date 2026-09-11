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
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../../../config/db";
import { LicenseHistoryEventTypeEnum } from "../../../shared/enums/license/license-history-event-type.enum";
import { LicenseHistoryTargetEntityTypeEnum } from "../../../shared/enums/license/license-history-target-entity-type.enum";
import { LicenseRedemptionStatusEnum } from "../../../shared/enums/license/license-redemption-status.enum";
import { LicenseStatusEnum } from "../../../shared/enums/license/license-status.enum";
import { LicenseTransactionTypeEnum } from "../../../shared/enums/license/license-transaction-type.enum";
import { branches } from "../../branch/schemas/branch.schema";
import { devices } from "../../device/device.schema";
import { licensePlanMarketMapper } from "../../market/schemas/license-plan-market-mapper.schema";
import { markets } from "../../market/schemas/market.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { licenseResellerMapper } from "../../reseller/schemas/license-reseller-mapper.schema";
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
import { licensePlans } from "../schemas/license-plan.schema";
import { licenseRedemptionCodes } from "../schemas/license-redemption-code.schema";
import { licenseTerms } from "../schemas/license-terms.schema";
import { licenseTransactionItems } from "../schemas/license-transaction-item.schema";
import { licenses, type LicenseEntity } from "../schemas/license.schema";

type DbTransaction = Parameters<
  Parameters<Database["client"]["transaction"]>[0]
>[0];

export class LicenseRedemptionRepository {
  constructor(private readonly database: Database) {}

  private _noActiveRedemptionCondition(): SQL {
    return sql`NOT EXISTS (
      SELECT 1 FROM license_redemption_codes lrc
      WHERE licenses.id = ANY(lrc.license_ids)
        AND lrc.status NOT IN (${LicenseRedemptionStatusEnum.REVOKED}, ${LicenseRedemptionStatusEnum.EXPIRED})
    )`;
  }

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
      .select({ licenseIds: licenseRedemptionCodes.licenseIds })
      .from(licenseRedemptionCodes)
      .where(
        and(
          sql`${licenseRedemptionCodes.licenseIds} && ${input.licenseIds}`,
          sql`${licenseRedemptionCodes.status} NOT IN (${LicenseRedemptionStatusEnum.REVOKED}, ${LicenseRedemptionStatusEnum.EXPIRED})`,
        ),
      );

    const matched = new Set<string>();
    const requested = new Set(input.licenseIds);
    for (const row of rows) {
      for (const id of row.licenseIds) {
        if (requested.has(id)) matched.add(id);
      }
    }

    return Array.from(matched);
  }

  async findRedemptionPricingForLicense(
    licenseId: string,
  ): Promise<FindRedemptionPricingForLicenseRepoResult | null> {
    const [row] = await this.database.client
      .select({
        planId: licenseTerms.planId,
        lockedPlanName: licenseTerms.lockedPlanName,
        basePrice: licenseTerms.basePrice,
        lockedPrice: licenseTerms.lockedPrice,
        durationDays: licenseTerms.durationDays,
        marketId: licenseTerms.marketId,
      })
      .from(licenseTerms)
      .where(
        and(
          eq(licenseTerms.licenseId, licenseId),
          eq(licenseTerms.isActive, true),
        ),
      )
      .orderBy(desc(licenseTerms.createdAt))
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
        marketId: licenses.marketId,
        marketCountryCode: markets.countryCode,
      })
      .from(licenseResellerMapper)
      .innerJoin(licenses, eq(licenseResellerMapper.licenseId, licenses.id))
      .leftJoin(organizations, eq(licenses.organizationId, organizations.id))
      .leftJoin(branches, eq(licenses.branchId, branches.id))
      .leftJoin(devices, eq(licenses.deviceId, devices.id))
      .leftJoin(markets, eq(licenses.marketId, markets.id))
      .leftJoin(
        licenseTransactionItems,
        and(
          eq(licenseTransactionItems.licenseId, licenses.id),
          eq(
            licenseTransactionItems.transactionType,
            LicenseTransactionTypeEnum.RESELLER_PURCHASE,
          ),
        ),
      )
      .where(condition)
      .orderBy(desc(licenses.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return { licenses: rows as LicenseWithDetails[], total };
  }

  private async _createLicenseTermsForLicenses(
    tx: DbTransaction,
    params: { licenseIds: string[]; marketId: string; createdBy: string },
  ): Promise<void> {
    const licenseRows = await tx
      .select({ id: licenses.id, currentPlanId: licenses.currentPlanId })
      .from(licenses)
      .where(inArray(licenses.id, params.licenseIds));

    const planIds = Array.from(
      new Set(licenseRows.map((row) => row.currentPlanId)),
    );

    const planRows = await tx
      .select({
        planId: licensePlans.id,
        planName: licensePlans.name,
        durationDays: licensePlans.durationDays,
        marketPrice: licensePlanMarketMapper.price,
      })
      .from(licensePlans)
      .innerJoin(
        licensePlanMarketMapper,
        and(
          eq(licensePlanMarketMapper.planId, licensePlans.id),
          eq(licensePlanMarketMapper.marketId, params.marketId),
        ),
      )
      .where(inArray(licensePlans.id, planIds));

    const planById = new Map(planRows.map((row) => [row.planId, row]));

    for (const licenseRow of licenseRows) {
      const plan = planById.get(licenseRow.currentPlanId);
      if (!plan) {
        throw new Error(
          `Plan ${licenseRow.currentPlanId} has no price for market ${params.marketId}`,
        );
      }

      await tx.insert(licenseTerms).values({
        licenseId: licenseRow.id,
        planId: licenseRow.currentPlanId,
        lockedPlanName: plan.planName,
        marketId: params.marketId,
        basePrice: plan.marketPrice,
        lockedPrice: plan.marketPrice,
        durationDays: plan.durationDays,
        createdBy: params.createdBy,
      });
    }
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
          marketId: input.marketId,
          licenseIds: input.licenseIds,
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

      await this._createLicenseTermsForLicenses(tx, {
        licenseIds: input.licenseIds,
        marketId: input.marketId,
        createdBy: input.createdBy,
      });

      for (const licenseId of input.licenseIds) {
        await tx.insert(licenseHistory).values({
          licenseId,
          eventType: LicenseHistoryEventTypeEnum.REDEMPTION_CODE_GENERATED,
          targetEntityType: LicenseHistoryTargetEntityTypeEnum.RESELLER,
          performedBy: input.createdBy,
          remarks: "Redemption code generated",
        });
      }

      const { redeemCodeHash: _redeemCodeHash, ...codeWithoutHash } =
        insertedCode;
      return codeWithoutHash;
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
          marketId: licenseRedemptionCodes.marketId,
          licenseIds: licenseRedemptionCodes.licenseIds,
          status: licenseRedemptionCodes.status,
          soldPrice: licenseRedemptionCodes.soldPrice,
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
        itemCount: sql<number>`COALESCE(array_length(${licenseRedemptionCodes.licenseIds}, 1), 0)`,
      })
      .from(licenseRedemptionCodes)
      .where(condition)
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

    const { redeemCodeHash: _redeemCodeHash, ...codeWithoutHash } = code;
    return codeWithoutHash;
  }

  async findRedemptionCodeDetailsById(
    input: FindRedemptionCodeDetailsByIdRepoInput,
  ): Promise<FindRedemptionCodeDetailsByIdRepoResult | null> {
    const [code] = await this.database.client
      .select({
        id: licenseRedemptionCodes.id,
        resellerId: licenseRedemptionCodes.resellerId,
        redeemCode: licenseRedemptionCodes.redeemCode,
        marketId: licenseRedemptionCodes.marketId,
        licenseIds: licenseRedemptionCodes.licenseIds,
        status: licenseRedemptionCodes.status,
        soldPrice: licenseRedemptionCodes.soldPrice,
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

    if (code.licenseIds.length === 0) {
      return { code, licenses: [] };
    }

    const licenseRows = await this.database.client
      .select({
        licenseId: licenses.id,
        licenseKey: licenses.licenseKey,
        lockedPlanName: licenseTerms.lockedPlanName,
        lockedPrice: licenseTerms.lockedPrice,
      })
      .from(licenses)
      .leftJoin(
        licenseTerms,
        and(
          eq(licenseTerms.licenseId, licenses.id),
          eq(licenseTerms.isActive, true),
        ),
      )
      .where(inArray(licenses.id, code.licenseIds));

    return {
      code,
      licenses: licenseRows.map((row) => ({
        licenseId: row.licenseId,
        licenseKey: row.licenseKey,
        lockedPrice: row.lockedPrice,
        planName: row.lockedPlanName,
      })),
    };
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
        },
      );

      if (!verified) return false;

      for (const item of input.items) {
        await tx
          .update(licenseTerms)
          .set({ lockedPrice: item.lockedPrice })
          .where(
            and(
              eq(licenseTerms.licenseId, item.licenseId),
              eq(licenseTerms.isActive, true),
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

      for (const licenseId of revoked.licenseIds) {
        await tx.insert(licenseHistory).values({
          licenseId,
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

        const licenseIds = claimed.licenseIds;

        const claimedLicenses: LicenseEntity[] = [];
        for (const licenseId of licenseIds) {
          const [updatedLicense] = await tx
            .update(licenses)
            .set({
              organizationId: input.organizationId,
              branchId: input.branchId,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(licenses.id, licenseId),
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
          .where(inArray(licenseResellerMapper.licenseId, licenseIds));

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
