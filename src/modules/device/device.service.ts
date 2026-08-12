import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { DEVICE_TYPE_SHORT_LABELS } from "../../shared/enums/device/device-type.enum";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { AppError } from "../../shared/errors/app-error";
import { hashData } from "../../shared/utils/core/bcrypt.helper";
import { createRandomReadableCode } from "../../shared/utils/core/crypto.helper";
import type { DeviceRepository } from "./device.repository";
import { DeviceEntity } from "./device.schema";
import type { CreateDeviceBodyDto } from "./dtos/create-device-request.dto";
import type { UpdateDeviceBodyDto } from "./dtos/update-device-request.dto";
import type { LicenseService } from "../license/license.service";

export class DeviceService {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly licenseService: LicenseService,
  ) {}

  async createDevice(
    data: CreateDeviceBodyDto,
    user: UserTokenDto,
    effectiveTenant: EffectiveTenant,
  ) {
    const shortLabel = DEVICE_TYPE_SHORT_LABELS[data.deviceType] || "DVC";
    const randPart = createRandomReadableCode(8);
    const deviceCode = `${shortLabel}-${randPart.slice(0, 4)}-${randPart.slice(4)}`;

    const hashedPin = await hashData(String(data.pin));

    const device = await this.deviceRepository.create({
      ...data,
      pin: hashedPin,
      deviceCode,
      organizationId:
        effectiveTenant.organizationId || (user.organizationId as string),
      createdBy: user.id,
    });

    return device;
  }

  async getDevices(
    effectiveTenant: EffectiveTenant,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      type?: number;
      branchId?: string;
      isActive?: boolean;
      sortBy?: string;
      sortOrder?: SortingOrderEnum;
    } = {},
  ) {
    const orgIdFilter = effectiveTenant.organizationId;
    const branchIdFilter = effectiveTenant.branchId || filters.branchId || undefined;
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    const { devices, total } = await this.deviceRepository.getDevices(
      orgIdFilter,
      branchIdFilter,
      undefined,
      page,
      limit,
      filters.search,
      filters.type,
      filters.isActive,
      filters.sortBy,
      filters.sortOrder,
    );

    return {
      devices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deviceAuthCheck(id: string) {
    const device = await this.deviceRepository.findById(id);
    if (!device) {
      throw new AppError("Device not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    if (!device.isActive) {
      throw new AppError(
        "Device is deactivated. Please contact your administrator.",
        {
          statusCode: HttpStatusCodes.FORBIDDEN,
        },
      );
    }

    const { pin, ...deviceWithoutPin } = device;
    const licenseInfo = await this.licenseService.getLicenseForDevice(id);

    return {
      device: deviceWithoutPin,
      license: licenseInfo.license,
    };
  }

  async updateDevice(data: UpdateDeviceBodyDto, user: UserTokenDto) {
    const { id, pin, ...updateData } = data;
    const existing = await this.deviceRepository.findById(id);
    if (!existing) {
      throw new AppError("Device not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const prepareData: Partial<DeviceEntity> = {
      branchId: updateData.branchId,
      name: updateData.name ?? undefined,
      deviceCode: updateData.deviceCode ?? undefined,
      deviceType: updateData.deviceType ?? undefined,
      updatedBy: user.id,
    };

    if (pin !== undefined && pin !== null) {
      prepareData.pin = await hashData(String(pin));
    }

    const updated = await this.deviceRepository.update(id, prepareData);

    return updated;
  }

  async toggleDeviceStatus(id: string, user: UserTokenDto) {
    const existing = await this.deviceRepository.findById(id);
    if (!existing) {
      throw new AppError("Device not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const updated = await this.deviceRepository.update(id, {
      isActive: !existing.isActive,
      updatedBy: user.id,
    });

    return updated;
  }
}
