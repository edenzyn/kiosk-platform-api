import { and, count, eq, inArray } from "drizzle-orm";
import type { Database } from "../../config/db";
import { branches } from "../branch/branch.schema";
import {
  devices,
  type DeviceEntity,
  type DeviceWithBranchEntity,
} from "./device.schema";
import type { CreateDeviceRequestDto } from "./dtos/create-device-request.dto";

export class DeviceRepository {
  constructor(private readonly database: Database) {}

  async create(data: CreateDeviceRequestDto): Promise<DeviceEntity> {
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
      .returning();

    if (!device) {
      throw new Error("Failed to create device");
    }

    return device;
  }

  async getDevices(
    organizationId?: string,
    branchId?: string,
    deviceIds?: string[],
    page?: number,
    limit?: number,
  ): Promise<{
    devices: DeviceWithBranchEntity[];
    total: number;
  }> {
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

    if (page && limit) {
      query = query.limit(limit).offset((page - 1) * limit);
    }

    const rows = await query;
    return {
      devices: rows as DeviceWithBranchEntity[],
      total,
    };
  }

  async findById(id: string): Promise<DeviceEntity | null> {
    const [device] = await this.database.client
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1);
    return device || null;
  }

  async update(id: string, data: Partial<DeviceEntity>): Promise<DeviceEntity> {
    const [updated] = await this.database.client
      .update(devices)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update device");
    }

    return updated;
  }
}
