import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { SocketEventEnum } from "../../shared/enums/socket/socket-event.enum";
import { AppError } from "../../shared/errors/app-error";
import type { RealtimeProvider } from "../../shared/providers/realtime/realtime.provider";
import { formatDateInTimezone } from "../../shared/utils/core/date.helper";
import type { BranchRepository } from "../branch/branch.repository";
import type { BusinessDayRepository } from "./business-day.repository";
import type {
  CloseBusinessDayServiceInput,
  CloseBusinessDayServiceResult,
  FindCurrentBusinessDayIdServiceInput,
  GetBusinessDayLogsServiceInput,
  GetBusinessDayLogsServiceResult,
  GetBusinessDaysServiceInput,
  GetBusinessDaysServiceResult,
  GetCurrentBusinessDayServiceInput,
  GetCurrentBusinessDayServiceResult,
  GetDeviceBusinessDayServiceInput,
  GetDeviceBusinessDayServiceResult,
  GetOpenBusinessDayIdServiceInput,
  OpenBusinessDayServiceInput,
  OpenBusinessDayServiceResult,
} from "./business-day.types";

export class BusinessDayService {
  constructor(
    private readonly businessDayRepository: BusinessDayRepository,
    private readonly branchRepository: BranchRepository,
    private readonly realtimeProvider: RealtimeProvider,
  ) {}

  // ========================================
  // ? USER BUSINESS DAY APIS
  // ========================================
  async getCurrentBusinessDay(
    input: GetCurrentBusinessDayServiceInput,
  ): Promise<GetCurrentBusinessDayServiceResult> {
    const { branchId } = input.effectiveTenant;

    if (!branchId) {
      throw new AppError("A branch must be selected to view its business day", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const settings = await this.branchRepository.getOrCreateSettings(branchId);
    const businessDate = formatDateInTimezone(
      new Date(),
      settings.timezone,
      "YYYY-MM-DD",
    );

    const day =
      (await this.businessDayRepository.findOpenDay({ branchId })) ??
      (await this.businessDayRepository.findOneByDate({
        branchId,
        businessDate,
      }));

    return {
      businessDate,
      timezone: settings.timezone,
      day: day
        ? await this.businessDayRepository.findSummary({ id: day.id })
        : null,
    };
  }

  async openBusinessDay(
    input: OpenBusinessDayServiceInput,
  ): Promise<OpenBusinessDayServiceResult> {
    const { effectiveTenant, user, dto } = input;
    const { organizationId, branchId } = effectiveTenant;

    if (!branchId) {
      throw new AppError("A branch must be selected to open its business day", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const settings = await this.branchRepository.getOrCreateSettings(branchId);
    const businessDate = formatDateInTimezone(
      new Date(),
      settings.timezone,
      "YYYY-MM-DD", // Business date format
    );
    const openDay = await this.businessDayRepository.findOpenDay({ branchId });

    if (openDay?.businessDate === businessDate) {
      throw new AppError("The business day is already open", {
        statusCode: HttpStatusCodes.CONFLICT,
        code: ErrorCodes.RESOURCE_ALREADY_EXISTS,
      });
    }

    if (openDay && !dto.closePreviousDay) {
      throw new AppError(
        `The business day of ${openDay.businessDate} is still open. Close it before opening today.`,
        {
          statusCode: HttpStatusCodes.CONFLICT,
          code: ErrorCodes.PREVIOUS_BUSINESS_DAY_OPEN,
        },
      );
    }

    const { day } = await this.businessDayRepository.openDay({
      organizationId,
      branchId,
      businessDate,
      performedBy: user.id,
      closeDayId: openDay?.id ?? null,
    });

    this.realtimeProvider.emitToBranch(
      branchId,
      SocketEventEnum.BUSINESS_DAY_OPENED,
      { businessDayId: day.id, businessDate: day.businessDate },
    );

    return this.getCurrentBusinessDay({ effectiveTenant });
  }

  async closeBusinessDay(
    input: CloseBusinessDayServiceInput,
  ): Promise<CloseBusinessDayServiceResult> {
    const { effectiveTenant, user } = input;
    const { branchId } = effectiveTenant;

    if (!branchId) {
      throw new AppError(
        "A branch must be selected to close its business day",
        {
          statusCode: HttpStatusCodes.BAD_REQUEST,
          code: ErrorCodes.BAD_REQUEST,
        },
      );
    }

    const openDay = await this.businessDayRepository.findOpenDay({ branchId });
    const closedDay = openDay
      ? await this.businessDayRepository.closeDay({
          id: openDay.id,
          performedBy: user.id,
        })
      : null;

    if (!closedDay) {
      throw new AppError("There is no open business day to close", {
        statusCode: HttpStatusCodes.CONFLICT,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    this.realtimeProvider.emitToBranch(
      branchId,
      SocketEventEnum.BUSINESS_DAY_CLOSED,
      { businessDayId: closedDay.id, businessDate: closedDay.businessDate },
    );

    return this.getCurrentBusinessDay({ effectiveTenant });
  }

  async getBusinessDays(
    input: GetBusinessDaysServiceInput,
  ): Promise<GetBusinessDaysServiceResult> {
    const { effectiveTenant, filters } = input;
    const { organizationId, branchId } = effectiveTenant;
    const page = filters.page || 1;
    const limit = filters.limit || 10;

    if (!branchId) {
      throw new AppError(
        "A branch must be selected to view its business days",
        {
          statusCode: HttpStatusCodes.BAD_REQUEST,
          code: ErrorCodes.BAD_REQUEST,
        },
      );
    }

    const [{ businessDays, total }, settings] = await Promise.all([
      this.businessDayRepository.findDays({
        ...filters,
        organizationId,
        branchId,
        page,
        limit,
      }),
      this.branchRepository.getOrCreateSettings(branchId),
    ]);

    return {
      businessDays,
      timezone: settings.timezone,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBusinessDayLogs(
    input: GetBusinessDayLogsServiceInput,
  ): Promise<GetBusinessDayLogsServiceResult> {
    const { effectiveTenant, businessDayId } = input;
    const { organizationId, branchId } = effectiveTenant;

    const day = branchId
      ? await this.businessDayRepository.findOne({
          id: businessDayId,
          organizationId,
          branchId,
        })
      : null;

    if (!day) {
      throw new AppError("Business day not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    const logs = await this.businessDayRepository.findDayLogs({
      businessDayId: day.id,
    });

    return { logs };
  }

  // ========================================
  // ? DEVICE BUSINESS DAY APIS
  // ========================================
  async getDeviceBusinessDay(
    input: GetDeviceBusinessDayServiceInput,
  ): Promise<GetDeviceBusinessDayServiceResult> {
    const openDay = await this.businessDayRepository.findOpenDay({
      branchId: input.device.branchId,
    });

    return {
      isOpen: Boolean(openDay),
      businessDate: openDay?.businessDate ?? null,
    };
  }

  // ========================================
  // ? ORDER BUSINESS DAY
  // ========================================
  async getOpenBusinessDayId(
    input: GetOpenBusinessDayIdServiceInput,
  ): Promise<string> {
    const openDay = await this.businessDayRepository.findOpenDay({
      branchId: input.branchId,
    });

    if (!openDay) {
      throw new AppError("The branch is closed for orders right now", {
        statusCode: HttpStatusCodes.CONFLICT,
        code: ErrorCodes.BUSINESS_DAY_CLOSED,
      });
    }

    return openDay.id;
  }

  async findCurrentBusinessDayId(
    input: FindCurrentBusinessDayIdServiceInput,
  ): Promise<string | null> {
    const openDay = await this.businessDayRepository.findOpenDay({
      branchId: input.branchId,
    });
    if (openDay) return openDay.id;

    const settings = await this.branchRepository.getOrCreateSettings(
      input.branchId,
    );
    const todayDay = await this.businessDayRepository.findOneByDate({
      branchId: input.branchId,
      businessDate: formatDateInTimezone(
        new Date(),
        settings.timezone,
        "YYYY-MM-DD",
      ),
    });

    return todayDay?.id ?? null;
  }
}
