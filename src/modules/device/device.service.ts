import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { DEVICE_TYPE_SHORT_LABELS } from "../../shared/enums/device/device-type.enum";
import { hashData } from "../../shared/utils/core/bcrypt.helper";
import { createRandomReadableCode } from "../../shared/utils/core/crypto.helper";
import type { DeviceRepository } from "./device.repository";
import type { CreateDeviceBodyDto } from "./dtos/create-device-request.dto";

export class DeviceService {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  async createDevice(
    data: CreateDeviceBodyDto,
    user: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ) {
    const shortLabel = DEVICE_TYPE_SHORT_LABELS[data.deviceType] || "DVC";
    const randPart = createRandomReadableCode(8);
    const deviceCode = `${shortLabel}-${randPart.slice(0, 4)}-${randPart.slice(4)}`;

    const hashedPin = await hashData(String(data.pin));

    const { pin, ...rest } = await this.deviceRepository.create({
      ...data,
      pin: hashedPin,
      deviceCode,
      organizationId:
        effectiveTenant.organizationId || (user.organizationId as string),
      createdBy: user.id,
    });

    return rest;
  }

  async getDevices(
    effectiveTenant: EffectiveTenant,
    page: number = 1,
    limit: number = 10,
  ) {
    const orgIdFilter = effectiveTenant.organizationId;
    const branchIdFilter = effectiveTenant.branchId || undefined;

    const { devices, total } = await this.deviceRepository.getDevices(
      orgIdFilter,
      branchIdFilter,
      undefined,
      page,
      limit,
    );

    return {
      devices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
