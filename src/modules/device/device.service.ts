import type jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import {
  DEVICE_ADMIN_CONSTANTS,
  DEVICE_STAFF_CONSTANTS,
} from "../../shared/constants/auth-security.constants";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { RedisKeys } from "../../shared/constants/redis-keys.constants";
import type { DeviceStaffTokenDto } from "../../shared/dtos/device-staff-token.dto";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { DeviceAdminAuthMethodEnum } from "../../shared/enums/device/device-admin-auth-method.enum";
import { DeviceLogActionEnum } from "../../shared/enums/device/device-log-action.enum";
import {
  DEVICE_TYPE_SHORT_LABELS,
  DeviceTypeEnum,
} from "../../shared/enums/device/device-type.enum";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { SocketEventEnum } from "../../shared/enums/socket/socket-event.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { AppError } from "../../shared/errors/app-error";
import type { RealtimeProvider } from "../../shared/providers/realtime/realtime.provider";
import type { RedisProvider } from "../../shared/providers/redis/redis.provider";
import { isTenantActiveCheck } from "../../shared/utils/auth/tenant-active-check.helper";
import {
  compareHashedData,
  hashData,
} from "../../shared/utils/core/bcrypt.helper";
import {
  createRandomReadableCode,
  hashSha256,
} from "../../shared/utils/core/crypto.helper";
import { resolveExpiryDate } from "../../shared/utils/core/date.helper";
import { generateToken, verifyToken } from "../../shared/utils/core/jwt.helper";
import type { AuthRepository } from "../auth/auth.repository";
import type { BranchRepository } from "../branch/branch.repository";
import type { BranchService } from "../branch/branch.service";
import type { LicenseRepository } from "../license/repositories/license.repository";
import type { LicenseService } from "../license/services/license.service";
import type { OrganizationRepository } from "../organization/organization.repository";
import type { RbacService } from "../rbac/rbac.service";
import type { UserEntity } from "../user/schemas/user.schema";
import type { UserRepository } from "../user/user.repository";
import { DeviceMapper } from "./device.mapper";
import type { DeviceRepository } from "./device.repository";
import { DeviceEntity } from "./device.schema";
import type {
  CreateDeviceServiceInput,
  CreateDeviceServiceResult,
  DeviceAdminLoginServiceInput,
  DeviceAdminLoginServiceResult,
  DeviceAdminStaffLoginServiceInput,
  DeviceAuthCheckServiceInput,
  DeviceAuthCheckServiceResult,
  DeviceStaffLoginServiceInput,
  DeviceStaffLogoutServiceInput,
  DeviceStaffSessionServiceResult,
  GenerateDeviceStaffTokensServiceInput,
  GenerateDeviceStaffTokensServiceResult,
  GetDeviceDetailsServiceInput,
  GetDeviceDetailsServiceResult,
  GetDeviceLogsServiceInput,
  GetDeviceLogsServiceResult,
  GetDevicesServiceInput,
  GetDevicesServiceResult,
  IssueDeviceAdminSessionServiceInput,
  MapDeviceTerminalServiceInput,
  MapDeviceTerminalServiceResult,
  MapOwnTerminalServiceInput,
  MapOwnTerminalServiceResult,
  RefreshDeviceStaffSessionServiceInput,
  RevokeDeviceSessionServiceInput,
  RevokeDeviceStaffSessionServiceInput,
  ToggleDeviceStatusServiceInput,
  ToggleDeviceStatusServiceResult,
  UpdateDeviceServiceInput,
  UpdateDeviceServiceResult,
  VerifyDeviceUserSecretServiceInput,
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
    private readonly userRepository: UserRepository,
    private readonly rbacService: RbacService,
    private readonly redisProvider: RedisProvider,
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
    const staffSession = await this.deviceRepository.findOpenStaffSession({
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
      staffSession: staffSession ?? null,
    };
  }

  async revokeDeviceStaffSession(
    input: RevokeDeviceStaffSessionServiceInput,
  ): Promise<void> {
    const { id, user, effectiveTenant } = input;

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

    const staffSession = await this.deviceRepository.findOpenStaffSession({
      deviceId: device.id,
    });
    if (!staffSession) {
      throw new AppError("No staff member is signed in on this device", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    await this.deviceRepository.endStaffSessions({ deviceId: device.id });

    await this.deviceRepository.createLog({
      data: {
        organizationId: device.organizationId,
        branchId: device.branchId,
        deviceId: device.id,
        action: DeviceLogActionEnum.STAFF_SESSION_REVOKED,
        performedBy: user.id,
        metadata: { staffName: staffSession.staff.name },
      },
    });

    this.realtimeProvider.emitToDevice(
      device.id,
      SocketEventEnum.DEVICE_STAFF_SESSION_REVOKED,
      { deviceId: device.id },
    );
  }

  async revokeDeviceSession(
    input: RevokeDeviceSessionServiceInput,
  ): Promise<void> {
    const { id, user, effectiveTenant } = input;

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
    await this.deviceRepository.endStaffSessions({ deviceId: device.id });
    if (revokedCount === 0) {
      throw new AppError("This device has no active session", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    await this.deviceRepository.createLog({
      data: {
        organizationId: device.organizationId,
        branchId: device.branchId,
        deviceId: device.id,
        action: DeviceLogActionEnum.SESSION_REVOKED,
        performedBy: user.id,
      },
    });

    this.realtimeProvider.emitToDevice(
      device.id,
      SocketEventEnum.DEVICE_SESSION_REVOKED,
      { deviceId: device.id },
    );
    this.realtimeProvider.disconnectDevice(device.id);
  }

  async getDeviceLogs(
    input: GetDeviceLogsServiceInput,
  ): Promise<GetDeviceLogsServiceResult> {
    const { id, effectiveTenant, filters } = input;
    const page = filters.page || 1;
    const limit = filters.limit || 10;

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

    const { logs, total } = await this.deviceRepository.findLogs({
      deviceId: device.id,
      page,
      limit,
    });

    return {
      logs,
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

    await this.deviceRepository.createLog({
      data: {
        organizationId: updated.organizationId,
        branchId: updated.branchId,
        deviceId: updated.id,
        action: updated.isActive
          ? DeviceLogActionEnum.ACTIVATED
          : DeviceLogActionEnum.DEACTIVATED,
        performedBy: input.user.id,
      },
    });

    if (!updated.isActive) {
      await this.authRepository.revokeDeviceSessions({ deviceId: updated.id });
      await this.deviceRepository.endStaffSessions({ deviceId: updated.id });
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

    const updated = await this.deviceRepository.update({
      id: input.id,
      data: {
        terminalId: input.terminalId,
        updatedBy: input.user.id,
      },
    });

    await this.deviceRepository.createLog({
      data: {
        organizationId: updated.organizationId,
        branchId: updated.branchId,
        deviceId: updated.id,
        action: input.terminalId
          ? DeviceLogActionEnum.TERMINAL_MAPPED
          : DeviceLogActionEnum.TERMINAL_UNMAPPED,
        performedBy: input.user.id,
        metadata: { terminalId: input.terminalId ?? existing.terminalId },
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

  // ========================================
  // ? DEVICE ADMIN SERVICES
  // ========================================
  async verifyDeviceUserSecret(
    input: VerifyDeviceUserSecretServiceInput,
  ): Promise<UserEntity> {
    const { device, identity, userId, method, secret, attemptsKey } = input;

    const attempts = Number((await this.redisProvider.get(attemptsKey)) ?? 0);
    if (attempts >= DEVICE_ADMIN_CONSTANTS.LOGIN_MAX_ATTEMPTS) {
      throw new AppError(
        "Too many wrong attempts. Try again in a few minutes.",
        {
          statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
          code: ErrorCodes.TOO_MANY_REQUESTS,
        },
      );
    }

    const user = userId
      ? await this.userRepository.findOne({ id: userId })
      : await this.userRepository.findOne(
          identity?.includes("@") ? { email: identity } : { mobile: identity },
        );

    const isAllowedUser =
      user !== undefined &&
      user.isActive &&
      user.userType === UserTypeEnums.NORMAL &&
      user.organizationId === device.organizationId &&
      (user.branchId === null || user.branchId === device.branchId);

    const storedSecret =
      method === DeviceAdminAuthMethodEnum.PIN ? user?.pin : user?.password;

    if (
      isAllowedUser &&
      method === DeviceAdminAuthMethodEnum.PIN &&
      !user.pin
    ) {
      throw new AppError(
        "You haven't set a PIN yet. Sign in with your password.",
        {
          statusCode: HttpStatusCodes.BAD_REQUEST,
          code: ErrorCodes.BAD_REQUEST,
        },
      );
    }

    const isSecretValid =
      isAllowedUser && storedSecret
        ? await compareHashedData(secret, storedSecret)
        : false;

    if (!isAllowedUser || !isSecretValid) {
      const failedAttempts = await this.redisProvider.incr(attemptsKey);
      if (failedAttempts === 1) {
        await this.redisProvider.expire(
          attemptsKey,
          DEVICE_ADMIN_CONSTANTS.LOGIN_LOCK_SECONDS,
        );
      }

      await this.deviceRepository.createLog({
        data: {
          organizationId: device.organizationId,
          branchId: device.branchId,
          deviceId: device.id,
          action: input.failedAction,
          performedBy: isAllowedUser ? user.id : null,
          metadata: identity ? { identity } : null,
        },
      });

      throw new AppError("Incorrect sign-in details", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    await this.redisProvider.del(attemptsKey);

    return user;
  }

  async issueDeviceAdminSession(
    input: IssueDeviceAdminSessionServiceInput,
  ): Promise<DeviceAdminLoginServiceResult> {
    const { device, user } = input;

    const permissions = await this.rbacService.getUserPermissionKeys({
      userId: user.id,
      organizationId: device.organizationId,
      branchId: user.branchId,
    });
    const canManageDevice = user.branchId
      ? permissions.has(UserPermissions.BRANCH_ALL_WRITE) ||
        permissions.has(UserPermissions.BRANCH_DEVICE_ADMIN)
      : permissions.has(UserPermissions.ORGANIZATION_ALL_WRITE) ||
        permissions.has(UserPermissions.ORGANIZATION_DEVICE_ADMIN);

    if (!canManageDevice) {
      throw new AppError("You don't have permission to manage this device", {
        statusCode: HttpStatusCodes.FORBIDDEN,
        code: ErrorCodes.FORBIDDEN,
      });
    }

    const adminToken = generateToken(
      { deviceAdmin: { deviceId: device.id, userId: user.id } },
      env.JWT_ACCESS_SECRET,
      { expiresIn: DEVICE_ADMIN_CONSTANTS.SESSION_EXPIRES_IN },
    );

    await this.deviceRepository.createLog({
      data: {
        organizationId: device.organizationId,
        branchId: device.branchId,
        deviceId: device.id,
        action: DeviceLogActionEnum.ADMIN_PANEL_ENTERED,
        performedBy: user.id,
      },
    });

    const expiresAt = resolveExpiryDate(
      DEVICE_ADMIN_CONSTANTS.SESSION_EXPIRES_IN,
    );

    return {
      adminToken,
      expiresAt,
      expiresInSeconds: Math.round((expiresAt.getTime() - Date.now()) / 1000),
      admin: { id: user.id, name: user.name },
    };
  }

  async deviceAdminLogin(
    input: DeviceAdminLoginServiceInput,
  ): Promise<DeviceAdminLoginServiceResult> {
    const { device, dto } = input;
    const identity = dto.identity.trim().toLowerCase();

    const user = await this.verifyDeviceUserSecret({
      device,
      identity,
      method: dto.method,
      secret: dto.secret,
      attemptsKey: RedisKeys.deviceAdminLoginAttempts(device.id, identity),
      failedAction: DeviceLogActionEnum.ADMIN_PANEL_ENTRY_FAILED,
    });

    return this.issueDeviceAdminSession({ device, user });
  }

  async deviceAdminStaffLogin(
    input: DeviceAdminStaffLoginServiceInput,
  ): Promise<DeviceAdminLoginServiceResult> {
    const { device, staff, dto } = input;

    const user = await this.verifyDeviceUserSecret({
      device,
      userId: staff.userId,
      method: dto.method,
      secret: dto.secret,
      attemptsKey: RedisKeys.deviceAdminLoginAttempts(device.id, staff.userId),
      failedAction: DeviceLogActionEnum.ADMIN_PANEL_ENTRY_FAILED,
    });

    return this.issueDeviceAdminSession({ device, user });
  }

  // ========================================
  // ? DEVICE STAFF APIS
  // ========================================
  generateDeviceStaffTokens(
    input: GenerateDeviceStaffTokensServiceInput,
  ): GenerateDeviceStaffTokensServiceResult {
    const { deviceStaff, sessionExpiresAt } = input;

    const sessionSecondsLeft = Math.max(
      1,
      Math.floor((sessionExpiresAt.getTime() - Date.now()) / 1000),
    );
    const expiresInSeconds = Math.min(
      DEVICE_STAFF_CONSTANTS.ACCESS_EXPIRES_IN_SECONDS,
      sessionSecondsLeft,
    );

    return {
      staffToken: generateToken({ deviceStaff }, env.JWT_ACCESS_SECRET, {
        expiresIn: expiresInSeconds,
      }),
      expiresInSeconds,
      refreshToken: generateToken({ deviceStaff }, env.JWT_REFRESH_SECRET, {
        expiresIn: sessionSecondsLeft,
        jwtid: deviceStaff.sessionId,
      }),
    };
  }

  readDeviceStaffSessionId(refreshToken: string): string | null {
    try {
      const decoded = verifyToken<
        jwt.JwtPayload & { deviceStaff?: DeviceStaffTokenDto }
      >(refreshToken, env.JWT_REFRESH_SECRET);

      return decoded.deviceStaff?.sessionId ?? null;
    } catch {
      return null;
    }
  }

  async deviceStaffLogin(
    input: DeviceStaffLoginServiceInput,
  ): Promise<DeviceStaffSessionServiceResult> {
    const { device, dto } = input;
    const identity = dto.identity.trim().toLowerCase();

    const user = await this.verifyDeviceUserSecret({
      device,
      identity,
      method: dto.method,
      secret: dto.secret,
      attemptsKey: RedisKeys.deviceStaffLoginAttempts(device.id, identity),
      failedAction: DeviceLogActionEnum.STAFF_LOGIN_FAILED,
    });

    const canOperateDevice = await this.rbacService.hasDeviceStaffPermission({
      userId: user.id,
      organizationId: device.organizationId,
      branchId: user.branchId,
      deviceType: device.type,
    });

    if (!canOperateDevice) {
      throw new AppError("You don't have permission to use this device", {
        statusCode: HttpStatusCodes.FORBIDDEN,
        code: ErrorCodes.FORBIDDEN,
      });
    }

    await this.deviceRepository.endStaffSessions({ deviceId: device.id });

    const sessionId = randomUUID();
    const sessionExpiresAt = new Date(
      Date.now() + DEVICE_STAFF_CONSTANTS.SESSION_MAX_AGE_SECONDS * 1000,
    );
    const tokens = this.generateDeviceStaffTokens({
      deviceStaff: {
        sessionId,
        deviceId: device.id,
        userId: user.id,
        userBranchId: user.branchId,
      },
      sessionExpiresAt,
    });

    await this.deviceRepository.createStaffSession({
      data: {
        id: sessionId,
        organizationId: device.organizationId,
        branchId: device.branchId,
        deviceId: device.id,
        userId: user.id,
        tokenHash: hashSha256(tokens.refreshToken),
        expiresAt: sessionExpiresAt,
      },
    });

    await this.deviceRepository.createLog({
      data: {
        organizationId: device.organizationId,
        branchId: device.branchId,
        deviceId: device.id,
        action: DeviceLogActionEnum.STAFF_LOGIN,
        performedBy: user.id,
      },
    });

    return {
      ...tokens,
      sessionExpiresAt,
      staff: { id: user.id, name: user.name },
    };
  }

  async refreshDeviceStaffSession(
    input: RefreshDeviceStaffSessionServiceInput,
  ): Promise<DeviceStaffSessionServiceResult> {
    const { device } = input;
    const sessionExpiredError = new AppError(
      "Your staff session has ended. Sign in again.",
      {
        statusCode: HttpStatusCodes.FORBIDDEN,
        code: ErrorCodes.DEVICE_STAFF_SESSION_EXPIRED,
      },
    );

    const sessionId = this.readDeviceStaffSessionId(input.refreshToken);
    if (!sessionId) throw sessionExpiredError;

    const session = await this.deviceRepository.findActiveStaffSession({
      id: sessionId,
      deviceId: device.id,
      tokenHash: hashSha256(input.refreshToken),
    });
    if (!session) throw sessionExpiredError;

    const user = await this.userRepository.findOne({ id: session.userId });
    const canOperateDevice =
      user !== undefined &&
      user.isActive &&
      (await this.rbacService.hasDeviceStaffPermission({
        userId: user.id,
        organizationId: device.organizationId,
        branchId: user.branchId,
        deviceType: device.type,
      }));

    if (!user || !canOperateDevice) {
      await this.deviceRepository.endStaffSessions({
        deviceId: device.id,
        id: session.id,
      });
      throw sessionExpiredError;
    }

    const tokens = this.generateDeviceStaffTokens({
      deviceStaff: {
        sessionId: session.id,
        deviceId: device.id,
        userId: user.id,
        userBranchId: user.branchId,
      },
      sessionExpiresAt: session.expiresAt,
    });

    const isRotated = await this.deviceRepository.rotateStaffSession({
      id: session.id,
      currentTokenHash: session.tokenHash,
      newTokenHash: hashSha256(tokens.refreshToken),
    });
    if (!isRotated) throw sessionExpiredError;

    return {
      ...tokens,
      sessionExpiresAt: session.expiresAt,
      staff: { id: user.id, name: user.name },
    };
  }

  async deviceStaffLogout(input: DeviceStaffLogoutServiceInput): Promise<void> {
    const { device } = input;

    const sessionId = this.readDeviceStaffSessionId(input.refreshToken);
    if (!sessionId) return;

    const session = await this.deviceRepository.findActiveStaffSession({
      id: sessionId,
      deviceId: device.id,
      tokenHash: hashSha256(input.refreshToken),
    });
    if (!session) return;

    await this.deviceRepository.endStaffSessions({
      deviceId: device.id,
      id: session.id,
    });

    await this.deviceRepository.createLog({
      data: {
        organizationId: device.organizationId,
        branchId: device.branchId,
        deviceId: device.id,
        action: DeviceLogActionEnum.STAFF_LOGOUT,
        performedBy: session.userId,
      },
    });
  }

  async mapOwnTerminal(
    input: MapOwnTerminalServiceInput,
  ): Promise<MapOwnTerminalServiceResult> {
    const { device, admin, dto } = input;

    await this.mapDeviceTerminal({
      id: device.id,
      terminalId: dto.terminalId,
      user: { id: admin.userId },
    });

    const updated = await this.deviceRepository.findOne({ id: device.id });
    if (!updated) {
      throw new AppError("Device not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    return { device: DeviceMapper.toDeviceAuthResponse(updated) };
  }
}
