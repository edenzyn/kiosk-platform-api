import { env } from "../../../config/env";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { LicenseRedemptionStatusEnum } from "../../../shared/enums/license/license-redemption-status.enum";
import { AppError } from "../../../shared/errors/app-error";
import {
  decryptData,
  encryptData,
  hashSha256,
} from "../../../shared/utils/core/crypto.helper";
import { generateReadableLicenseKey } from "../../../shared/utils/license/generate-readable-license-key.helper";
import type { BranchRepository } from "../../branch/branch.repository";
import type { MarketRepository } from "../../market/market.repository";
import type {
  GenerateRedemptionCodeServiceInput,
  GenerateRedemptionCodeServiceResult,
  GetAvailableLicensesForRedemptionServiceInput,
  GetAvailableLicensesForRedemptionServiceResult,
  GetRedemptionCodeDetailsForResellerServiceInput,
  GetRedemptionCodeDetailsForResellerServiceResult,
  GetRedemptionCodesForResellerServiceInput,
  GetRedemptionCodesForResellerServiceResult,
  RedeemLicenseCodeServiceInput,
  RedeemLicenseCodeServiceResult,
  RevokeRedemptionCodeServiceInput,
  RevokeRedemptionCodeServiceResult,
  VerifyRedemptionCodeServiceInput,
  VerifyRedemptionCodeServiceResult,
} from "../license.types";
import type { LicenseRedemptionRepository } from "../repositories/license-redemption.repository";
import type { LicenseRepository } from "../repositories/license.repository";

export class LicenseRedemptionService {
  constructor(
    private readonly licenseRedemptionRepository: LicenseRedemptionRepository,
    private readonly licenseRepository: LicenseRepository,
    private readonly branchRepository: BranchRepository,
    private readonly marketRepository: MarketRepository,
  ) {}

  async generateRedemptionCode(
    input: GenerateRedemptionCodeServiceInput,
  ): Promise<GenerateRedemptionCodeServiceResult> {
    const { licenseIds, redeemExpiresAt, remarks } = input.dto;

    const ownedAvailable =
      await this.licenseRepository.findOwnedAvailableLicenses({
        resellerId: input.resellerId,
        licenseIds,
      });

    if (ownedAvailable.length !== licenseIds.length) {
      throw new AppError(
        "One or more selected licenses are unavailable or not owned by you",
        { statusCode: HttpStatusCodes.BAD_REQUEST },
      );
    }

    const blockedLicenseIds =
      await this.licenseRedemptionRepository.findLicenseIdsWithActiveRedemption(
        {
          licenseIds,
        },
      );
    if (blockedLicenseIds.length > 0) {
      throw new AppError(
        "One or more selected licenses already have an active redemption code",
        { statusCode: HttpStatusCodes.CONFLICT },
      );
    }

    const marketIds = new Set(
      ownedAvailable.map((license) => license.marketId),
    );
    if (marketIds.size > 1) {
      throw new AppError(
        "All licenses bundled into a redemption code must belong to the same market",
        { statusCode: HttpStatusCodes.BAD_REQUEST },
      );
    }

    const [marketId] = Array.from(marketIds);
    if (!marketId) {
      throw new AppError("Could not determine the market for these licenses", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const isMapped = await this.marketRepository.isResellerMappedToMarket({
      resellerId: input.resellerId,
      marketId,
    });
    if (!isMapped) {
      throw new AppError("This market is not available for you", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    const plaintextCode = generateReadableLicenseKey("RDM");
    const encryptedCode = encryptData(
      plaintextCode,
      env.LICENSE_ENCRYPTION_KEY,
    );
    const codeHash = hashSha256(plaintextCode);

    const created = await this.licenseRedemptionRepository.createRedemptionCode(
      {
        resellerId: input.resellerId,
        redeemCode: encryptedCode,
        redeemCodeHash: codeHash,
        marketId,
        licenseIds,
        status: LicenseRedemptionStatusEnum.GENERATED,
        redeemExpiresAt,
        remarks,
        createdBy: input.resellerId,
        updatedBy: input.resellerId,
      },
    );

    return {
      redemptionCode: { ...created, redeemCode: plaintextCode },
    };
  }

  async getAvailableLicensesForRedemption(
    input: GetAvailableLicensesForRedemptionServiceInput,
  ): Promise<GetAvailableLicensesForRedemptionServiceResult> {
    const page = input.filters.page || 1;
    const limit = input.filters.limit || 10;

    const { licenses: rows, total } =
      await this.licenseRedemptionRepository.findAvailableLicensesForRedemption(
        {
          resellerId: input.resellerId,
          marketId: input.filters.marketId,
          page,
          limit,
        },
      );

    const decryptedRows = rows.map((row) => ({
      ...row,
      licenseKey: decryptData(row.licenseKey, env.LICENSE_ENCRYPTION_KEY),
    }));

    return {
      licenses: decryptedRows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRedemptionCodesForReseller(
    input: GetRedemptionCodesForResellerServiceInput,
  ): Promise<GetRedemptionCodesForResellerServiceResult> {
    const page = input.filters.page || 1;
    const limit = input.filters.limit || 10;

    const { redemptionCodes: rows, total } =
      await this.licenseRedemptionRepository.findRedemptionCodesByReseller({
        resellerId: input.resellerId,
        page,
        limit,
        search: input.filters.search,
        status: input.filters.status,
        sortBy: input.filters.sortBy,
        sortOrder: input.filters.sortOrder,
      });

    const decryptedRows = rows.map((row) => ({
      ...row,
      redeemCode: decryptData(row.redeemCode, env.LICENSE_ENCRYPTION_KEY),
    }));

    return {
      redemptionCodes: decryptedRows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRedemptionCodeDetailsForReseller(
    input: GetRedemptionCodeDetailsForResellerServiceInput,
  ): Promise<GetRedemptionCodeDetailsForResellerServiceResult> {
    const details =
      await this.licenseRedemptionRepository.findRedemptionCodeDetailsById({
        id: input.redemptionId,
        resellerId: input.resellerId,
      });

    if (!details) {
      throw new AppError("Redemption code not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    return {
      redemptionCode: {
        ...details.code,
        redeemCode: decryptData(
          details.code.redeemCode,
          env.LICENSE_ENCRYPTION_KEY,
        ),
        marketCurrencyCode: details.marketCurrencyCode,
        licenses: details.licenses.map((license) => ({
          ...license,
          licenseKey: decryptData(
            license.licenseKey,
            env.LICENSE_ENCRYPTION_KEY,
          ),
        })),
      },
    };
  }

  async verifyRedemptionCode(
    input: VerifyRedemptionCodeServiceInput,
  ): Promise<VerifyRedemptionCodeServiceResult> {
    const { totalSoldPrice, items } = input.dto;

    const details =
      await this.licenseRedemptionRepository.findRedemptionCodeDetailsById({
        id: input.redemptionId,
        resellerId: input.resellerId,
      });

    if (!details) {
      throw new AppError("Redemption code not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const bundledLicenseIds = new Set(
      details.licenses.map((license) => license.licenseId),
    );
    const submittedLicenseIds = new Set(items.map((item) => item.licenseId));
    const sameLicenseSet =
      bundledLicenseIds.size === submittedLicenseIds.size &&
      [...bundledLicenseIds].every((id) => submittedLicenseIds.has(id));

    if (!sameLicenseSet) {
      throw new AppError(
        "Submitted licenses do not match this redemption code's bundled licenses",
        { statusCode: HttpStatusCodes.BAD_REQUEST },
      );
    }

    const basePriceByLicenseId = new Map(
      details.licenses.map((license) => [
        license.licenseId,
        Number(license.basePrice) || 0,
      ]),
    );
    const hasBelowMinimumPrice = items.some(
      (item) =>
        item.lockedPrice < (basePriceByLicenseId.get(item.licenseId) ?? 0),
    );
    if (hasBelowMinimumPrice) {
      throw new AppError(
        "Sold price for a license cannot be less than what it originally cost",
        { statusCode: HttpStatusCodes.BAD_REQUEST },
      );
    }

    const itemsSum = items.reduce((sum, item) => sum + item.lockedPrice, 0);
    if (Math.abs(itemsSum - totalSoldPrice) > 0.01) {
      throw new AppError(
        "Per-license locked prices must add up to the total sold price",
        { statusCode: HttpStatusCodes.BAD_REQUEST },
      );
    }

    const verified =
      await this.licenseRedemptionRepository.verifyRedemptionCode({
        id: input.redemptionId,
        resellerId: input.resellerId,
        totalSoldPrice: totalSoldPrice.toFixed(2),
        items: items.map((item) => ({
          licenseId: item.licenseId,
          lockedPrice: item.lockedPrice.toFixed(2),
        })),
      });

    if (!verified) {
      throw new AppError(
        "Redemption code is not in a claimed state and cannot be verified",
        {
          statusCode: HttpStatusCodes.CONFLICT,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        },
      );
    }

    return true;
  }

  async revokeRedemptionCode(
    input: RevokeRedemptionCodeServiceInput,
  ): Promise<RevokeRedemptionCodeServiceResult> {
    const revoked = await this.licenseRedemptionRepository.revokeRedemptionCode(
      {
        id: input.redemptionId,
        resellerId: input.resellerId,
      },
    );

    if (!revoked) {
      throw new AppError(
        "Redemption code not found or already claimed/revoked",
        {
          statusCode: HttpStatusCodes.CONFLICT,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        },
      );
    }

    return true;
  }

  async redeemLicenseCode(
    input: RedeemLicenseCodeServiceInput,
  ): Promise<RedeemLicenseCodeServiceResult> {
    const codeHash = hashSha256(input.dto.redeemCode.trim());

    const existing =
      await this.licenseRedemptionRepository.findRedemptionCodeByHash({
        redeemCodeHash: codeHash,
      });

    if (!existing) {
      throw new AppError("Invalid redeem code.", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    if (existing.status !== LicenseRedemptionStatusEnum.GENERATED) {
      const messages: Partial<Record<number, string>> = {
        [LicenseRedemptionStatusEnum.CLAIMED]:
          "This code has already been redeemed.",
        [LicenseRedemptionStatusEnum.VERIFIED]:
          "This code has already been redeemed.",
        [LicenseRedemptionStatusEnum.REVOKED]: "This code has been revoked.",
        [LicenseRedemptionStatusEnum.EXPIRED]: "This code has expired.",
      };
      throw new AppError(
        messages[existing.status] ?? "This code can no longer be redeemed.",
        { statusCode: HttpStatusCodes.CONFLICT },
      );
    }

    if (
      existing.redeemExpiresAt &&
      new Date(existing.redeemExpiresAt) < new Date()
    ) {
      throw new AppError("This code has expired.", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    const { organizationId, branchId } = input.effectiveTenant;
    if (branchId) {
      const branch = await this.branchRepository.findOne({ id: branchId });
      if (!branch) {
        throw new AppError("Branch not found", {
          statusCode: HttpStatusCodes.NOT_FOUND,
          code: ErrorCodes.RESOURCE_NOT_FOUND,
        });
      }
      if (branch.marketId !== existing.marketId) {
        throw new AppError(
          "This redeem code's market is not available for your branch",
          { statusCode: HttpStatusCodes.BAD_REQUEST },
        );
      }
    } else {
      const isMapped = await this.marketRepository.isOrganizationMappedToMarket(
        { organizationId, marketId: existing.marketId },
      );
      if (!isMapped) {
        throw new AppError(
          "This redeem code's market is not available for your organization",
          { statusCode: HttpStatusCodes.BAD_REQUEST },
        );
      }
    }

    const result = await this.licenseRedemptionRepository.claimRedemptionCode({
      redeemCodeHash: codeHash,
      organizationId: input.effectiveTenant.organizationId,
      branchId: input.effectiveTenant.branchId || null,
      claimedByUserId: input.userId,
    });

    if (!result.ok) {
      if (result.reason === "licenses_unavailable") {
        throw new AppError(
          "One or more licenses in this code are no longer available.",
          { statusCode: HttpStatusCodes.CONFLICT },
        );
      }
      throw new AppError("This code was just redeemed or is no longer valid.", {
        statusCode: HttpStatusCodes.CONFLICT,
      });
    }

    const decryptedLicenses = result.licenses.map(
      ({ createdBy, updatedBy, ...rest }) => ({
        ...rest,
        licenseKey: decryptData(rest.licenseKey, env.LICENSE_ENCRYPTION_KEY),
      }),
    );

    return { licenses: decryptedLicenses };
  }
}
