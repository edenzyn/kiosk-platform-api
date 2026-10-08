import {
  WHATSAPP_TEMPLATES,
  WHATSAPP_TEMPLATE_LANGUAGES,
} from "../../shared/constants/whatsapp-templates.constants";
import { RedisKeys } from "../../shared/constants/redis-keys.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { DeviceLogActionEnum } from "../../shared/enums/device/device-log-action.enum";
import { NotificationChannelEnum } from "../../shared/enums/notification/notification-channel.enum";
import { OneTimeTokenTypeEnum } from "../../shared/enums/one-time-token/one-time-token-type.enum";
import { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { ManagerVerificationMethodEnum } from "../../shared/enums/shift/manager-verification-method.enum";
import { ShiftEndTypeEnum } from "../../shared/enums/shift/shift-end-type.enum";
import { ShiftStatusEnum } from "../../shared/enums/shift/shift-status.enum";
import { ShiftVerifierEnum } from "../../shared/enums/shift/shift-verifier.enum";
import { SocketEventEnum } from "../../shared/enums/socket/socket-event.enum";
import { UserTypeEnums } from "../../shared/enums/user/user-type.enum";
import { BadRequestError } from "../../shared/errors/bad-request-error";
import { ConflictError } from "../../shared/errors/conflict-error";
import { ForbiddenError } from "../../shared/errors/forbidden-error";
import { NotFoundError } from "../../shared/errors/not-found-error";
import type { RealtimeProvider } from "../../shared/providers/realtime/realtime.provider";
import { maskEmail, maskMobile } from "../../shared/utils/core/string.helper";
import { getTwoFactorOtpTemplate } from "../../shared/utils/emailTemplates/two-factor-otp.template";
import type { OneTimeTokenService } from "../auth/services/one-time-token.service";
import type { BranchRepository } from "../branch/branch.repository";
import type { BusinessDayRepository } from "../business-day/business-day.repository";
import type { DeviceService } from "../device/device.service";
import type { MarketRepository } from "../market/market.repository";
import type { NotificationService } from "../notification/notification.service";
import type { RbacService } from "../rbac/rbac.service";
import type { UserEntity } from "../user/schemas/user.schema";
import type { UserRepository } from "../user/user.repository";
import { ShiftMapper } from "./shift.mapper";
import type { ShiftRepository } from "./shift.repository";
import type {
  EndShiftServiceInput,
  EndShiftServiceResult,
  FindShiftManagerServiceInput,
  ForceCloseShiftServiceInput,
  ForceCloseShiftServiceResult,
  GetActiveShiftIdServiceInput,
  GetBusinessDayShiftsServiceInput,
  GetBusinessDayShiftsServiceResult,
  GetCurrentShiftServiceInput,
  GetCurrentShiftServiceResult,
  GetShiftManagersServiceInput,
  GetShiftManagersServiceResult,
  GetShiftSummaryServiceInput,
  GetShiftSummaryServiceResult,
  SendShiftVerificationCodeServiceInput,
  SendShiftVerificationCodeServiceResult,
  StartShiftServiceInput,
  StartShiftServiceResult,
  VerifyShiftServiceInput,
  VerifyShiftServiceResult,
} from "./shift.types";

export class ShiftService {
  constructor(
    private readonly shiftRepository: ShiftRepository,
    private readonly branchRepository: BranchRepository,
    private readonly businessDayRepository: BusinessDayRepository,
    private readonly marketRepository: MarketRepository,
    private readonly userRepository: UserRepository,
    private readonly rbacService: RbacService,
    private readonly deviceService: DeviceService,
    private readonly oneTimeTokenService: OneTimeTokenService,
    private readonly notificationService: NotificationService,
    private readonly realtimeProvider: RealtimeProvider,
  ) {}

  // ========================================
  // ? DEVICE SHIFT APIS
  // ========================================
  async getCurrentShift(
    input: GetCurrentShiftServiceInput,
  ): Promise<GetCurrentShiftServiceResult> {
    const { device, staff } = input;

    const [shift, settings, market] = await Promise.all([
      this.shiftRepository.findOpenShift({ deviceId: device.id }),
      this.branchRepository.getOrCreateSettings(device.branchId),
      this.marketRepository.findMarketByBranch({ branchId: device.branchId }),
    ]);
    const shiftStaff = shift
      ? await this.userRepository.findOne({ id: shift.userId })
      : undefined;

    return {
      shift:
        shift && shiftStaff
          ? ShiftMapper.toDeviceShift(shift, shiftStaff)
          : null,
      isOwnShift: shift?.userId === staff.userId,
      currencyCode: market?.currencyCode ?? null,
      shiftVerifier: settings.shiftVerifier,
      managerVerificationMethod: settings.managerVerificationMethod,
    };
  }

  async getShiftManagers(
    input: GetShiftManagersServiceInput,
  ): Promise<GetShiftManagersServiceResult> {
    const { device, staff, filters } = input;
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    const { managers, total } = await this.shiftRepository.findShiftManagers({
      organizationId: device.organizationId,
      branchId: device.branchId,
      excludeUserId: staff.userId,
      search: filters.search,
      page,
      limit,
    });

    return {
      managers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sendShiftVerificationCode(
    input: SendShiftVerificationCodeServiceInput,
  ): Promise<SendShiftVerificationCodeServiceResult> {
    const { device, staff, dto } = input;

    const settings = await this.branchRepository.getOrCreateSettings(
      device.branchId,
    );
    if (
      settings.shiftVerifier !== ShiftVerifierEnum.SHIFT_MANAGER ||
      settings.managerVerificationMethod !== ManagerVerificationMethodEnum.OTP
    ) {
      throw new BadRequestError(
        "This branch does not verify shifts with a one-time code",
      );
    }

    const manager = await this._findShiftManager({
      device,
      staff,
      managerId: dto.managerId,
    });

    const destination = manager.email ?? manager.mobile;
    if (!destination) {
      throw new BadRequestError(
        "This shift manager has no email or mobile number to receive a code",
      );
    }

    const { verificationId, code } = await this.oneTimeTokenService.issue({
      userId: manager.id,
      type: OneTimeTokenTypeEnum.SHIFT_VERIFICATION,
      channel: manager.email
        ? NotificationChannelEnum.EMAIL
        : NotificationChannelEnum.WHATSAPP,
      destination,
    });

    await Promise.all([
      manager.email
        ? this.notificationService.send(NotificationChannelEnum.EMAIL, {
            to: manager.email,
            ...getTwoFactorOtpTemplate({ code }),
          })
        : undefined,
      manager.mobile
        ? this.notificationService.send(NotificationChannelEnum.WHATSAPP, {
            to: manager.mobile,
            template: {
              name: WHATSAPP_TEMPLATES.OTP,
              languageCode: WHATSAPP_TEMPLATE_LANGUAGES.ENGLISH_US,
              bodyParams: [code, "shift verification"],
              buttons: [{ index: 0, param: code }],
            },
          })
        : undefined,
    ]);

    return {
      verificationId,
      sentTo: [
        ...(manager.email ? [maskEmail(manager.email)] : []),
        ...(manager.mobile ? [maskMobile(manager.mobile)] : []),
      ],
    };
  }

  async startShift(
    input: StartShiftServiceInput,
  ): Promise<StartShiftServiceResult> {
    const { device, staff, dto } = input;

    const openDay = await this.businessDayRepository.findOpenDay({
      branchId: device.branchId,
    });
    if (!openDay) {
      throw new ConflictError(
        "The business day must be open before a shift can start",
        { code: ErrorCodes.BUSINESS_DAY_CLOSED },
      );
    }

    const [deviceShift, staffShift, market] = await Promise.all([
      this.shiftRepository.findOpenShift({ deviceId: device.id }),
      this.shiftRepository.findOpenShift({ userId: staff.userId }),
      this.marketRepository.findMarketByBranch({ branchId: device.branchId }),
    ]);

    if (deviceShift) {
      throw deviceShift.userId === staff.userId
        ? new ConflictError("Your shift is already open on this counter")
        : new ConflictError(
            "Another staff member's shift is still open on this counter",
            { code: ErrorCodes.SHIFT_HELD_BY_ANOTHER_STAFF },
          );
    }

    if (staffShift) {
      throw new ConflictError(
        "You already have an open shift on another counter",
      );
    }

    if (!market) {
      throw new BadRequestError("This branch has no market");
    }

    const { verifiedBy, verificationMethod } = await this._verifyShift({
      device,
      staff,
      verification: dto.verification,
    });

    await this.shiftRepository.createShift({
      organizationId: device.organizationId,
      branchId: device.branchId,
      businessDayId: openDay.id,
      deviceId: device.id,
      deviceType: device.type,
      userId: staff.userId,
      currencyCode: market.currencyCode,
      openingCash: dto.openingCash.toFixed(2),
      startVerifiedBy: verifiedBy,
      startVerificationMethod: verificationMethod,
    });

    return this.getCurrentShift({ device, staff });
  }

  async getShiftSummary(
    input: GetShiftSummaryServiceInput,
  ): Promise<GetShiftSummaryServiceResult> {
    const { device, staff } = input;

    const shiftId = await this.getActiveShiftId({ device, staff });
    const [shift, totals] = await Promise.all([
      this.shiftRepository.findOpenShift({ deviceId: device.id }),
      this.shiftRepository.getShiftTotals({ shiftId }),
    ]);

    if (!shift) {
      throw new ConflictError("Start your shift to continue", {
        code: ErrorCodes.SHIFT_NOT_STARTED,
      });
    }

    return ShiftMapper.toShiftSummary(shift, totals);
  }

  async endShift(input: EndShiftServiceInput): Promise<EndShiftServiceResult> {
    const { device, staff, dto } = input;

    const shiftId = await this.getActiveShiftId({ device, staff });

    const { verifiedBy, verificationMethod } = await this._verifyShift({
      device,
      staff,
      verification: dto.verification,
    });

    const closedShift = await this.shiftRepository.closeShift({
      id: shiftId,
      endType: ShiftEndTypeEnum.ENDED_BY_STAFF,
      endedBy: staff.userId,
      note: dto.note || null,
      endVerifiedBy: verifiedBy,
      endVerificationMethod: verificationMethod,
    });
    if (!closedShift) {
      throw new ConflictError("This shift is already closed");
    }

    return {
      summary: ShiftMapper.toShiftSummary(
        closedShift,
        ShiftMapper.toSavedTotals(closedShift),
      ),
    };
  }

  // ========================================
  // ? USER SHIFT APIS
  // ========================================
  async getBusinessDayShifts(
    input: GetBusinessDayShiftsServiceInput,
  ): Promise<GetBusinessDayShiftsServiceResult> {
    const { effectiveTenant, businessDayId } = input;

    const rows = await this.shiftRepository.findBusinessDayShifts({
      businessDayId,
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId || undefined,
    });

    const shifts = await Promise.all(
      rows.map(async (row) =>
        ShiftMapper.toBusinessDayShift(
          row,
          row.shift.status === ShiftStatusEnum.OPEN
            ? await this.shiftRepository.getShiftTotals({
                shiftId: row.shift.id,
              })
            : ShiftMapper.toSavedTotals(row.shift),
        ),
      ),
    );

    return { shifts };
  }

  async forceCloseShift(
    input: ForceCloseShiftServiceInput,
  ): Promise<ForceCloseShiftServiceResult> {
    const { effectiveTenant, user, shiftId, dto } = input;

    const shift = await this.shiftRepository.findShift({
      id: shiftId,
      organizationId: effectiveTenant.organizationId,
      branchId: effectiveTenant.branchId || undefined,
    });
    if (!shift) {
      throw new NotFoundError("Shift not found");
    }

    const closedShift = await this.shiftRepository.closeShift({
      id: shift.id,
      endType: ShiftEndTypeEnum.FORCE_CLOSED,
      endedBy: user.id,
      note: dto.reason,
    });
    if (!closedShift) {
      throw new ConflictError("This shift is already closed");
    }

    this.realtimeProvider.emitToDevice(
      closedShift.deviceId,
      SocketEventEnum.SHIFT_FORCE_CLOSED,
      { shiftId: closedShift.id },
    );

    return { message: "Shift force closed" };
  }

  // ========================================
  // ? ORDER SHIFT
  // ========================================
  /** The staff member's own open shift on this counter; counter orders and payments need one. */
  async getActiveShiftId(input: GetActiveShiftIdServiceInput): Promise<string> {
    const { device, staff } = input;

    const shift = await this.shiftRepository.findOpenShift({
      deviceId: device.id,
    });

    if (!shift) {
      throw new ConflictError("Start your shift to continue", {
        code: ErrorCodes.SHIFT_NOT_STARTED,
      });
    }

    if (shift.userId !== staff?.userId) {
      throw new ConflictError(
        "Another staff member's shift is still open on this counter",
        { code: ErrorCodes.SHIFT_HELD_BY_ANOTHER_STAFF },
      );
    }

    return shift.id;
  }

  // ========================================
  // ? SHIFT VERIFICATION
  // ========================================
  /** A user of this branch, other than the staff member, who is allowed to verify shifts. */
  private async _findShiftManager(
    input: FindShiftManagerServiceInput,
  ): Promise<UserEntity> {
    const { device, staff, managerId } = input;

    if (managerId === staff.userId) {
      throw new ForbiddenError("You cannot verify your own shift");
    }

    const manager = await this.userRepository.findOne({ id: managerId });
    const isBranchUser =
      manager !== undefined &&
      manager.isActive &&
      manager.userType === UserTypeEnums.NORMAL &&
      manager.organizationId === device.organizationId &&
      (manager.branchId === null || manager.branchId === device.branchId);

    const permissions = isBranchUser
      ? await this.rbacService.getUserPermissionKeys({
          userId: manager.id,
          organizationId: device.organizationId,
          branchId: manager.branchId,
        })
      : new Set<string>();

    const canManageShifts = manager?.branchId
      ? permissions.has(UserPermissions.BRANCH_ALL_WRITE) ||
        permissions.has(UserPermissions.BRANCH_SHIFT_MANAGE)
      : permissions.has(UserPermissions.ORGANIZATION_ALL_WRITE);

    if (!isBranchUser || !canManageShifts) {
      throw new ForbiddenError("This person cannot verify shifts");
    }

    return manager;
  }

  /** Confirms a shift start or end the way the branch settings ask for. */
  private async _verifyShift(
    input: VerifyShiftServiceInput,
  ): Promise<VerifyShiftServiceResult> {
    const { device, staff, verification } = input;

    const settings = await this.branchRepository.getOrCreateSettings(
      device.branchId,
    );

    if (settings.shiftVerifier === ShiftVerifierEnum.STAFF) {
      return { verifiedBy: staff.userId, verificationMethod: null };
    }

    if (!verification) {
      throw new BadRequestError("A shift manager must verify this shift");
    }

    const manager = await this._findShiftManager({
      device,
      staff,
      managerId: verification.managerId,
    });

    if (
      settings.managerVerificationMethod === ManagerVerificationMethodEnum.OTP
    ) {
      if (!verification.verificationId || !verification.code) {
        throw new BadRequestError("Verification code is required");
      }

      await this.oneTimeTokenService.verify({
        verificationId: verification.verificationId,
        userId: manager.id,
        type: OneTimeTokenTypeEnum.SHIFT_VERIFICATION,
        code: verification.code,
      });

      return {
        verifiedBy: manager.id,
        verificationMethod: ManagerVerificationMethodEnum.OTP,
      };
    }

    if (!verification.method || !verification.secret) {
      throw new BadRequestError("PIN or password is required");
    }

    await this.deviceService.verifyDeviceUserSecret({
      device,
      userId: manager.id,
      method: verification.method,
      secret: verification.secret,
      attemptsKey: RedisKeys.shiftVerificationAttempts(device.id, manager.id),
      failedAction: DeviceLogActionEnum.SHIFT_VERIFICATION_FAILED,
      failedMessage: "Incorrect PIN or password",
    });

    return {
      verifiedBy: manager.id,
      verificationMethod: ManagerVerificationMethodEnum.PIN_OR_PASSWORD,
    };
  }
}
