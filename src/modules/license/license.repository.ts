import { and, eq, gt } from "drizzle-orm";
import type { Database } from "../../config/db";
import { LicenseStatusEnum } from "../../shared/enums/license/license-status.enum";
import type {
  ActivateLicenseRepoInput,
  ActivateLicenseRepoResult,
  FindActiveLicenseByDeviceIdRepoInput,
  FindActiveLicenseByDeviceIdRepoResult,
  FindLicenseByDeviceIdRepoInput,
  FindLicenseByDeviceIdRepoResult,
  FindLicenseByKeyRepoInput,
  FindLicenseByKeyRepoResult,
} from "./license.types";
import { licenses } from "./schemas/license.schema";

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

  async findByKey(
    input: FindLicenseByKeyRepoInput,
  ): Promise<FindLicenseByKeyRepoResult> {
    const [license] = await this.database.client
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKey, input.licenseKey))
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
      })
      .where(eq(licenses.id, input.licenseId))
      .returning();

    if (!updated) {
      throw new Error("Failed to activate license");
    }

    return updated;
  }
}
