import { and, eq, gt, or, ilike, count, asc, desc } from "drizzle-orm";
import type { Database } from "../../config/db";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import type {
  ActivateLicenseRepoInput,
  ActivateLicenseRepoResult,
  FindActiveLicenseByDeviceIdRepoInput,
  FindActiveLicenseByDeviceIdRepoResult,
  FindLicenseByDeviceIdRepoInput,
  FindLicenseByDeviceIdRepoResult,
  FindLicenseByKeyHashRepoInput,
  FindLicenseByKeyHashRepoResult,
  GetLicensesRepoInput,
  GetLicensesRepoResult,
  CreateLicensesRepoInput,
  CreateLicensesRepoResult,
} from "./license.types";
import { licenses } from "./schemas/license.schema";
import { branches } from "../branch/branch.schema";
import { devices } from "../device/device.schema";
import type { LicenseWithDetails } from "./dtos/get-licenses.dtos";

export class LicenseRepository {
  constructor(private readonly database: Database) {}

  async findByDeviceId(
    input: FindLicenseByDeviceIdRepoInput,
  ): Promise<FindLicenseByDeviceIdRepoResult> {
    const [license] = await this.database.client
      .select()
      .from(licenses)
      .where(eq(licenses.deviceId, input.deviceId))
      .limit(1);

    return license || null;
  }

  async findActiveByDeviceId(
    input: FindActiveLicenseByDeviceIdRepoInput,
  ): Promise<FindActiveLicenseByDeviceIdRepoResult> {
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

  async findByKeyHash(
    input: FindLicenseByKeyHashRepoInput,
  ): Promise<FindLicenseByKeyHashRepoResult> {
    const [license] = await this.database.client
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKeyHash, input.licenseKeyHash))
      .limit(1);

    return license || null;
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

  async getLicenses(
    input: GetLicensesRepoInput,
  ): Promise<GetLicensesRepoResult> {
    const {
      organizationId,
      branchId,
      page = 1,
      limit = 10,
      search,
      status,
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

  async createLicenses(
    input: CreateLicensesRepoInput,
  ): Promise<CreateLicensesRepoResult> {
    const created = await this.database.client
      .insert(licenses)
      .values(input.licenses)
      .returning();

    return created;
  }
}
