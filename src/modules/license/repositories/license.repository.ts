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
import { LicenseStatusEnum } from "../../../shared/enums/license/license-status.enum";
import { LicenseTransactionTypeEnum } from "../../../shared/enums/license/license-transaction-type.enum";
import { UserTypeEnums } from "../../../shared/enums/user/user-type.enum";
import { branches } from "../../branch/schemas/branch.schema";
import { devices } from "../../device/device.schema";
import { organizations } from "../../organization/schemas/organization.schema";
import { licenseResellerMapper } from "../../reseller/schemas/license-reseller-mapper.schema";
import { users } from "../../user/schemas/user.schema";
import type { LicenseWithDetails } from "../dtos/get-licenses.dtos";
import type {
  ActivateLicenseRepoInput,
  ActivateLicenseRepoResult,
  CreateLicenseHistoryRepoInput,
  CreateLicenseHistoryRepoResult,
  FindLicenseHistoryRepoInput,
  FindLicenseHistoryRepoResult,
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
  FindOwnedAvailableLicensesRepoInput,
  FindOwnedAvailableLicensesRepoResult,
  IsLicenseOwnedByResellerRepoInput,
  IsLicenseOwnedByResellerRepoResult,
  UpdateLicenseRepoInput,
  UpdateLicenseRepoResult,
} from "../license.types";
import { licenseHistory } from "../schemas/license-history.schema";
import { licenseTransactionItems } from "../schemas/license-transaction-item.schema";
import { licenses } from "../schemas/license.schema";
import { AppError } from "../../../shared/errors/app-error";
import { ErrorCodes } from "../../../shared/enums/core/error-codes.enum";
import { HttpStatusCodes } from "../../../shared/constants/http-status-codes.constants";
import { logger } from "../../../shared/utils/core/logger";

export class LicenseRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? LICENSE SCHEMA METHODS
  // ========================================
  async findOne(
    input: FindOneLicenseRepoInput,
  ): Promise<FindOneLicenseRepoResult> {
    try {
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
        return await null;
      }

      const [license] = await this.database.client
        .select()
        .from(licenses)
        .where(and(...conditions))
        .limit(1);

      return (await license) || null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_FIND_ONE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findOneActiveByDeviceId(
    input: FindOneActiveLicenseByDeviceIdRepoInput,
  ): Promise<FindOneActiveLicenseByDeviceIdRepoResult> {
    try {
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

      return (await license) || null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_FIND_ONE_ACTIVE_BY_DEVICE_ID_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findOneDetails(
    input: FindOneLicenseDetailsRepoInput,
  ): Promise<FindOneLicenseDetailsRepoResult> {
    try {
      const [license] = await this.database.client
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
        .from(licenses)
        .leftJoin(organizations, eq(organizations.id, licenses.organizationId))
        .leftJoin(branches, eq(branches.id, licenses.branchId))
        .leftJoin(devices, eq(devices.id, licenses.deviceId))
        .where(eq(licenses.id, input.licenseId))
        .limit(1);

      return (await license) || null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_FIND_ONE_DETAILS_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async find(input: FindLicensesRepoInput): Promise<FindLicensesRepoResult> {
    try {
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

      return await {
        licenses: rows as LicenseWithDetails[],
        total,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_FIND_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findByReseller(
    input: FindLicensesByResellerRepoInput,
  ): Promise<FindLicensesByResellerRepoResult> {
    try {
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
              licenseTransactionItems.transactionType,
              LicenseTransactionTypeEnum.RESELLER_PURCHASE,
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

      return await {
        licenses: rows as LicenseWithDetails[],
        total,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_FIND_BY_RESELLER_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async isLicenseOwnedByReseller(
    input: IsLicenseOwnedByResellerRepoInput,
  ): Promise<IsLicenseOwnedByResellerRepoResult> {
    try {
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

      return await !!mapping;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_IS_LICENSE_OWNED_BY_RESELLER_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findOwnedAvailableLicenses(
    input: FindOwnedAvailableLicensesRepoInput,
  ): Promise<FindOwnedAvailableLicensesRepoResult> {
    try {
      if (input.licenseIds.length === 0) return await [];

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

      return await rows.map((row) => row.license);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_FIND_OWNED_AVAILABLE_LICENSES_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findLicensesForStatusCheck(
    input?: FindLicensesForStatusCheckRepoInput,
  ): Promise<FindLicensesForStatusCheckRepoResult> {
    try {
      const targetStatuses = input?.statuses ?? [
        LicenseStatusEnum.ACTIVE,
        LicenseStatusEnum.GRACE_PERIOD,
      ];

      return await this.database.client
        .select()
        .from(licenses)
        .where(
          and(
            inArray(licenses.status, targetStatuses),
            isNotNull(licenses.expiresAt),
          ),
        );
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_FIND_LICENSES_FOR_STATUS_CHECK_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async activate(
    input: ActivateLicenseRepoInput,
  ): Promise<ActivateLicenseRepoResult> {
    try {
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

      return await updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_ACTIVATE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async update(
    input: UpdateLicenseRepoInput,
  ): Promise<UpdateLicenseRepoResult> {
    try {
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

      return await {
        ...updated,
        branchName: names?.branchName ?? null,
        deviceName: names?.deviceName ?? null,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_UPDATE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  // ========================================
  // ? LICENSE HISTORY SCHEMA METHODS
  // ========================================
  async findHistory(
    input: FindLicenseHistoryRepoInput,
  ): Promise<FindLicenseHistoryRepoResult> {
    try {
      const isResellerViewer = input.viewerType === UserTypeEnums.RESELLER;
      const isResellerActor = eq(users.userType, UserTypeEnums.RESELLER);

      const performedByName = isResellerViewer
        ? sql<string | null>`null`
        : sql<
            string | null
          >`case when ${isResellerActor} then 'Reseller' else ${users.name} end`;
      const performedByEmail = isResellerViewer
        ? sql<string | null>`null`
        : sql<
            string | null
          >`case when ${isResellerActor} then null else ${users.email} end`;

      return await this.database.client
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
          performedByName,
          performedByEmail,
          createdAt: licenseHistory.createdAt,
        })
        .from(licenseHistory)
        .leftJoin(users, eq(users.id, licenseHistory.performedBy))
        .where(
          and(
            eq(licenseHistory.licenseId, input.licenseId),
            inArray(licenseHistory.targetEntityType, input.targetEntityTypes),
          ),
        )
        .orderBy(desc(licenseHistory.createdAt));
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_FIND_HISTORY_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async createHistory(
    input: CreateLicenseHistoryRepoInput,
  ): Promise<CreateLicenseHistoryRepoResult> {
    try {
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
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[LICENSE_CREATE_HISTORY_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }
}
