import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../../config/db";
import { branches } from "../branch/schemas/branch.schema";
import { users } from "../user/schemas/user.schema";
import { deviceLogs } from "./device-log.schema";
import { devices, type DeviceWithBranchEntity } from "./device.schema";
import type {
  CreateDeviceLogRepoInput,
  CreateDeviceRepoInput,
  CreateDeviceRepoResult,
  FindDeviceLogsRepoInput,
  FindDeviceLogsRepoResult,
  FindDevicesRepoInput,
  FindDevicesRepoResult,
  FindOneDeviceRepoInput,
  FindOneDeviceRepoResult,
  UpdateDeviceRepoInput,
  UpdateDeviceRepoResult,
} from "./device.types";
import { AppError } from "../../shared/errors/app-error";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { logger } from "../../shared/utils/core/logger";

export class DeviceRepository {
  constructor(private readonly database: Database) {}

  // ========================================
  // ? DEVICE SCHEMA METHODS
  // ========================================
  async findOne(
    input: FindOneDeviceRepoInput,
  ): Promise<FindOneDeviceRepoResult> {
    try {
      const conditions: (SQL | undefined)[] = [];

      if (input.id !== undefined) {
        conditions.push(eq(devices.id, input.id));
      }
      if (input.deviceCode !== undefined) {
        conditions.push(eq(devices.deviceCode, input.deviceCode));
      }
      if (input.organizationId !== undefined) {
        conditions.push(eq(devices.organizationId, input.organizationId));
      }
      if (input.branchId !== undefined) {
        conditions.push(eq(devices.branchId, input.branchId));
      }

      if (conditions.length === 0) {
        return await null;
      }

      const [device] = await this.database.client
        .select()
        .from(devices)
        .where(and(...conditions))
        .limit(1);

      return (await device) || null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[DEVICE_FIND_ONE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async find(input: FindDevicesRepoInput): Promise<FindDevicesRepoResult> {
    try {
      const {
        organizationId,
        branchId,
        deviceIds,
        page,
        limit,
        search,
        deviceType,
        isActive,
        sortBy,
        sortOrder,
      } = input;
      const conditions = [];

      if (organizationId) {
        conditions.push(eq(devices.organizationId, organizationId));
      }

      if (branchId) {
        conditions.push(eq(devices.branchId, branchId));
      }

      if (deviceIds && deviceIds.length > 0) {
        conditions.push(inArray(devices.id, deviceIds));
      }

      if (deviceType !== undefined && deviceType !== null) {
        conditions.push(eq(devices.deviceType, deviceType));
      }

      if (isActive !== undefined && isActive !== null) {
        conditions.push(eq(devices.isActive, isActive));
      }

      if (search) {
        conditions.push(
          or(
            ilike(devices.name, `%${search}%`),
            ilike(devices.deviceCode, `%${search}%`),
          ),
        );
      }

      const condition = conditions.length > 0 ? and(...conditions) : undefined;

      // Count query
      const countQuery = this.database.client
        .select({ count: count() })
        .from(devices);
      const [countResult] = condition
        ? await countQuery.where(condition)
        : await countQuery;
      const total = Number(countResult?.count || 0);

      // Select query
      let query = this.database.client
        .select({
          id: devices.id,
          organizationId: devices.organizationId,
          branchId: devices.branchId,
          branchName: branches.name,
          deviceCode: devices.deviceCode,
          name: devices.name,
          deviceType: devices.deviceType,
          terminalId: devices.terminalId,
          isActive: devices.isActive,
          createdAt: devices.createdAt,
          updatedAt: devices.updatedAt,
          createdBy: devices.createdBy,
          updatedBy: devices.updatedBy,
        })
        .from(devices)
        .leftJoin(branches, eq(devices.branchId, branches.id))
        .$dynamic();

      if (condition) {
        query = query.where(condition);
      }

      if (sortBy && sortOrder) {
        const orderFn = sortOrder === "asc" ? asc : desc;
        if (sortBy === "name") {
          query = query.orderBy(orderFn(devices.name));
        } else if (sortBy === "deviceCode") {
          query = query.orderBy(orderFn(devices.deviceCode));
        } else if (sortBy === "deviceType") {
          query = query.orderBy(orderFn(devices.deviceType));
        } else if (sortBy === "isActive") {
          query = query.orderBy(orderFn(devices.isActive));
        } else if (sortBy === "createdAt") {
          query = query.orderBy(orderFn(devices.createdAt));
        }
      } else {
        query = query.orderBy(desc(devices.createdAt));
      }

      if (page && limit) {
        query = query.limit(limit).offset((page - 1) * limit);
      }

      const rows = await query;
      return await {
        devices: rows as DeviceWithBranchEntity[],
        total,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[DEVICE_FIND_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async create(input: CreateDeviceRepoInput): Promise<CreateDeviceRepoResult> {
    try {
      const { data } = input;
      const [device] = await this.database.client
        .insert(devices)
        .values({
          organizationId: data.organizationId,
          branchId: data.branchId,
          deviceCode: data.deviceCode ?? null,
          name: data.name ?? null,
          pin: data.pin ?? null,
          deviceType: data.deviceType ?? null,
          createdBy: data.createdBy,
        })
        .returning({
          id: devices.id,
          organizationId: devices.organizationId,
          branchId: devices.branchId,
          deviceCode: devices.deviceCode,
          name: devices.name,
          deviceType: devices.deviceType,
          terminalId: devices.terminalId,
          isActive: devices.isActive,
          createdAt: devices.createdAt,
          updatedAt: devices.updatedAt,
          createdBy: devices.createdBy,
          updatedBy: devices.updatedBy,
        });

      if (!device) {
        throw new Error("Failed to create device");
      }

      return await device;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[DEVICE_CREATE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async update(input: UpdateDeviceRepoInput): Promise<UpdateDeviceRepoResult> {
    try {
      const { id, data } = input;
      const [updated] = await this.database.client
        .update(devices)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(devices.id, id))
        .returning({
          id: devices.id,
          organizationId: devices.organizationId,
          branchId: devices.branchId,
          deviceCode: devices.deviceCode,
          name: devices.name,
          deviceType: devices.deviceType,
          terminalId: devices.terminalId,
          isActive: devices.isActive,
          createdAt: devices.createdAt,
          updatedAt: devices.updatedAt,
          createdBy: devices.createdBy,
          updatedBy: devices.updatedBy,
        });

      if (!updated) {
        throw new Error("Failed to update device");
      }

      return await updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[DEVICE_UPDATE_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  // ========================================
  // ? DEVICE LOG SCHEMA METHODS
  // ========================================
  async createLog(input: CreateDeviceLogRepoInput): Promise<void> {
    try {
      await this.database.client.insert(deviceLogs).values(input.data);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[DEVICE_CREATE_LOG_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }

  async findLogs(
    input: FindDeviceLogsRepoInput,
  ): Promise<FindDeviceLogsRepoResult> {
    try {
      const condition = eq(deviceLogs.deviceId, input.deviceId);

      const [rows, [totalRow]] = await Promise.all([
        this.database.client
          .select({
            id: deviceLogs.id,
            action: deviceLogs.action,
            performedBy: { id: users.id, name: users.name },
            metadata: deviceLogs.metadata,
            createdAt: deviceLogs.createdAt,
          })
          .from(deviceLogs)
          .leftJoin(users, eq(deviceLogs.performedBy, users.id))
          .where(condition)
          .orderBy(desc(deviceLogs.createdAt))
          .limit(input.limit)
          .offset((input.page - 1) * input.limit),
        this.database.client
          .select({ total: count() })
          .from(deviceLogs)
          .where(condition),
      ]);

      return { logs: rows, total: Number(totalRow?.total ?? 0) };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("[DEVICE_FIND_LOGS_ERROR] " + error);
      throw new AppError(`${error}`, {
        statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.DATABASE_ERROR,
      });
    }
  }
}
