import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { SocketEventEnum } from "../../shared/enums/socket/socket-event.enum";
import {
  DEVICE_TYPE_SHORT_LABELS,
  DeviceTypeEnum,
} from "../../shared/enums/device/device-type.enum";
import { AppError } from "../../shared/errors/app-error";
import type { RealtimeProvider } from "../../shared/providers/realtime/realtime.provider";
import { isTenantActiveCheck } from "../../shared/utils/auth/tenant-active-check.helper";
import { hashData } from "../../shared/utils/core/bcrypt.helper";
import { createRandomReadableCode } from "../../shared/utils/core/crypto.helper";
import type { AuthRepository } from "../auth/auth.repository";
import type { BranchRepository } from "../branch/branch.repository";
import type { BranchService } from "../branch/branch.service";
import type { LicenseRepository } from "../license/repositories/license.repository";
import type { LicenseService } from "../license/services/license.service";
import type { OrganizationRepository } from "../organization/organization.repository";
import { DeviceMapper } from "./device.mapper";
import type { DeviceRepository } from "./device.repository";
import { DeviceEntity } from "./device.schema";
import type {
  CreateDeviceServiceInput,
  CreateDeviceServiceResult,
  DeviceAuthCheckServiceInput,
  DeviceAuthCheckServiceResult,
  GetDeviceDetailsServiceInput,
  GetDeviceDetailsServiceResult,
  GetDevicesServiceInput,
  GetDevicesServiceResult,
  MapDeviceTerminalServiceInput,
  MapDeviceTerminalServiceResult,
  RevokeDeviceSessionServiceInput,
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
    private readonly organizationRepository: OrganizationRepository,
    private readonly branchRepository: BranchRepository,
    private readonly branchService: BranchService,
    private readonly licenseRepository: LicenseRepository,
    private readonly authRepository: AuthRepository,
    private readonly realtimeProvider: RealtimeProvider,
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
      deviceIds: filters.deviceIds,
      deviceType: filters.type,
      isActive: filters.isActive,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });

    const [licenses, onlineDeviceIds] = await Promise.all([
      this.licenseRepository.findSummariesByDeviceIds({
        deviceIds: devices.map((device) => device.id),
      }),
      this.realtimeProvider.getOnlineDeviceIds(),
    ]);

    return {
      devices: devices.map((device) => {
        const license = licenses.find((row) => row.deviceId === device.id);

        return {
          ...device,
          license: license
            ? {
                id: license.id,
                status: license.status,
                planName: license.planName,
                activatedAt: license.activatedAt,
                expiresAt: license.expiresAt,
              }
            : null,
          isOnline: onlineDeviceIds.has(device.id),
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDeviceDetails(
    input: GetDeviceDetailsServiceInput,
  ): Promise<GetDeviceDetailsServiceResult> {
    const { id, effectiveTenant } = input;

    const { devices } = await this.getDevices({
      effectiveTenant,
      filters: { deviceIds: [id], page: 1, limit: 1 },
    });
    const device = devices[0];

    if (!device) {
      throw new AppError("Device not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const session = await this.authRepository.findActiveDeviceSession({
      deviceId: device.id,
    });

    return {
      device,
      session: session && {
        id: session.id,
        deviceName: session.deviceName,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
      },
    };
  }

  async revokeDeviceSession(
    input: RevokeDeviceSessionServiceInput,
  ): Promise<void> {
    const { id, effectiveTenant } = input;

    const device = await this.deviceRepository.findOne({
      id,
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId ?? undefined,
    });
    if (!device) {
      throw new AppError("Device not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const revokedCount = await this.authRepository.revokeDeviceSessions({
      deviceId: device.id,
    });
    if (revokedCount === 0) {
      throw new AppError("This device has no active session", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    this.realtimeProvider.emitToDevice(
      device.id,
      SocketEventEnum.DEVICE_SESSION_REVOKED,
      { deviceId: device.id },
    );
    this.realtimeProvider.disconnectDevice(device.id);
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

    if (!updated.isActive) {
      await this.authRepository.revokeDeviceSessions({ deviceId: updated.id });
      this.realtimeProvider.emitToDevice(
        updated.id,
        SocketEventEnum.DEVICE_DEACTIVATED,
        { deviceId: updated.id },
      );
      this.realtimeProvider.disconnectDevice(updated.id);
    }

    return updated;
  }

  async mapDeviceTerminal(
    input: MapDeviceTerminalServiceInput,
  ): Promise<MapDeviceTerminalServiceResult> {
    const existing = await this.deviceRepository.findOne({ id: input.id });
    if (!existing) {
      throw new AppError("Device not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
      });
    }

    if (
      existing.deviceType !== DeviceTypeEnum.KIOSK &&
      existing.deviceType !== DeviceTypeEnum.COUNTER
    ) {
      throw new AppError("Only kiosk and counter devices can map a terminal", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
      });
    }

    return this.deviceRepository.update({
      id: input.id,
      data: {
        terminalId: input.terminalId,
        updatedBy: input.user.id,
      },
    });
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

    await isTenantActiveCheck(
      this.organizationRepository,
      this.branchRepository,
      device.organizationId,
      device.branchId,
    );

    const licenseInfo = await this.licenseService.getLicenseForDevice({
      deviceId: input.id,
    });

    const branding = await this.branchService.getBranding(device.branchId);

    return {
      device: DeviceMapper.toDeviceAuthResponse(device),
      license: licenseInfo.license,
      branding,
    };
  }
}
