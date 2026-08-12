import { and, eq, gt } from "drizzle-orm";
import type { Database } from "../../config/db";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import { licenses, type LicenseEntity } from "./schemas/license.schema";

export class LicenseRepository {
  constructor(private readonly database: Database) {}

  async findByDeviceId(deviceId: string): Promise<LicenseEntity | null> {
    const [license] = await this.database.client
      .select()
      .from(licenses)
      .where(eq(licenses.deviceId, deviceId))
      .limit(1);
    return license || null;
  }

  async findActiveByDeviceId(deviceId: string): Promise<LicenseEntity | null> {
    const now = new Date();
    const [license] = await this.database.client
      .select()
      .from(licenses)
      .where(
        and(
          eq(licenses.deviceId, deviceId),
          eq(licenses.status, LicenseStatusEnum.ACTIVE),
          gt(licenses.expiresAt, now),
        ),
      )
      .limit(1);
    return license || null;
  }

  async findByKey(licenseKey: string): Promise<LicenseEntity | null> {
    const [license] = await this.database.client
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKey, licenseKey))
      .limit(1);
    return license || null;
  }

  async activate(licenseId: string, deviceId: string): Promise<LicenseEntity> {
    const [updated] = await this.database.client
      .update(licenses)
      .set({
        deviceId,
        status: LicenseStatusEnum.ACTIVE,
        activatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(licenses.id, licenseId))
      .returning();

    if (!updated) {
      throw new Error("Failed to activate license");
    }

    return updated;
  }
}
