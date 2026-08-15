import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { DEVICE_TYPE_SHORT_LABELS } from "../../shared/enums/device/device-type.enum";
import { AppError } from "../../shared/errors/app-error";
import { hashData } from "../../shared/utils/core/bcrypt.helper";
import { createRandomReadableCode } from "../../shared/utils/core/crypto.helper";
import type { LicenseService } from "../license/license.service";
import type { DeviceRepository } from "./device.repository";
import { DeviceEntity } from "./device.schema";
import type {
  CreateDeviceServiceInput,
  CreateDeviceServiceResult,
  DeviceAuthCheckServiceInput,
  DeviceAuthCheckServiceResult,
  GetDevicesServiceInput,
  GetDevicesServiceResult,
  ToggleDeviceStatusServiceInput,
  ToggleDeviceStatusServiceResult,
  UpdateDeviceServiceInput,
  UpdateDeviceServiceResult,
} from "./device.types";
import type { CreateDeviceRequestDto } from "./dtos/create-device.dtos";

export class DeviceService {
  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly licenseService: LicenseService,
  ) {}

  // ========================================
  // ? USER CLIENT SERVICES
  // ========================================
  async createDevice(
    input: CreateDeviceServiceInput,
  ): Promise<CreateDeviceServiceResult> {
    const shortLabel = DEVICE_TYPE_SHORT_LABELS[input.data.deviceType] || "DVC";
    const randPart = createRandomReadableCode(8);
    const deviceCode = `${shortLabel}-${randPart.slice(0, 4)}-${randPart.slice(4)}`;

    const hashedPin = await hashData(String(input.data.pin));

    const device = await this.deviceRepository.create({
      data: {
        ...input.data,
        pin: hashedPin,
        deviceCode,
        organizationId:
          input.effectiveTenant.organizationId ||
          (input.user.organizationId as string),
        createdBy: input.user.id,
      } as CreateDeviceRequestDto,
    });

    return device;
  }

  async getDevices(
    input: GetDevicesServiceInput,
  ): Promise<GetDevicesServiceResult> {
    const filters = input.filters ?? {};
    const orgIdFilter = input.effectiveTenant.organizationId;
    const branchIdFilter =
      input.effectiveTenant.branchId || filters.branchId || undefined;
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    const { devices, total } = await this.deviceRepository.find({
      organizationId: orgIdFilter,
      branchId: branchIdFilter,
      page,
      limit,
      search: filters.search,
      deviceType: filters.type,
      isActive: filters.isActive,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });

    return {
      devices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateDevice(
    input: UpdateDeviceServiceInput,
  ): Promise<UpdateDeviceServiceResult> {
    const { id, pin, ...updateData } = input.data;
    const existing = await this.deviceRepository.findOne({ id });
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
      updatedBy: input.user.id,
    };

    if (pin !== undefined && pin !== null) {
      prepareData.pin = await hashData(String(pin));
    }

    const updated = await this.deviceRepository.update({
      id,
      data: prepareData,
    });

    return updated;
  }

  async toggleDeviceStatus(
    input: ToggleDeviceStatusServiceInput,
  ): Promise<ToggleDeviceStatusServiceResult> {
    const existing = await this.deviceRepository.findOne({ id: input.id });
    if (!existing) {
      throw new AppError("Device not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    const updated = await this.deviceRepository.update({
      id: input.id,
      data: {
        isActive: !existing.isActive,
        updatedBy: input.user.id,
      },
    });

    return updated;
  }

  // ========================================
  // ? DEVICE CLIENT SERVICES
  // ========================================
  async deviceAuthCheck(
    input: DeviceAuthCheckServiceInput,
  ): Promise<DeviceAuthCheckServiceResult> {
    const device = await this.deviceRepository.findOne({ id: input.id });
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
    const licenseInfo = await this.licenseService.getLicenseForDevice({
      deviceId: input.id,
    });

    return {
      device: deviceWithoutPin,
      license: licenseInfo.license,
    };
  }
}
