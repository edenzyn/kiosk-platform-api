import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { SocketEventEnum } from "../../shared/enums/socket/socket-event.enum";
import { BadRequestError } from "../../shared/errors/bad-request-error";
import { ConflictError } from "../../shared/errors/conflict-error";
import { NotFoundError } from "../../shared/errors/not-found-error";
import type { RealtimeProvider } from "../../shared/providers/realtime/realtime.provider";
import { formatDateInTimezone } from "../../shared/utils/core/date.helper";
import type { BranchRepository } from "../branch/branch.repository";
import type { OrderRepository } from "../order/order.repository";
import type { ShiftRepository } from "../shift/shift.repository";
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
  SetOrderingPausedServiceInput,
  SetOrderingPausedServiceResult,
} from "./business-day.types";

export class BusinessDayService {
  constructor(
    private readonly businessDayRepository: BusinessDayRepository,
    private readonly branchRepository: BranchRepository,
    private readonly realtimeProvider: RealtimeProvider,
    private readonly orderRepository: OrderRepository,
    private readonly shiftRepository: ShiftRepository,
  ) {}

  // ========================================
  // ? USER BUSINESS DAY APIS
  // ========================================
  async getCurrentBusinessDay(
    input: GetCurrentBusinessDayServiceInput,
  ): Promise<GetCurrentBusinessDayServiceResult> {
    const { branchId } = input.effectiveTenant;

    if (!branchId) {
      throw new BadRequestError(
        "A branch must be selected to view its business day",
      );
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

    const [summary, activeOrderCount] = day
      ? await Promise.all([
          this.businessDayRepository.findSummary({ id: day.id }),
          this.businessDayRepository.countActiveOrders({
            businessDayId: day.id,
          }),
        ])
      : [null, 0];

    return {
      businessDate,
      timezone: settings.timezone,
      day: summary,
      activeOrderCount,
    };
  }

  async openBusinessDay(
    input: OpenBusinessDayServiceInput,
  ): Promise<OpenBusinessDayServiceResult> {
    const { effectiveTenant, user, dto } = input;
    const { organizationId, branchId } = effectiveTenant;

    if (!branchId) {
      throw new BadRequestError(
        "A branch must be selected to open its business day",
      );
    }

    const settings = await this.branchRepository.getOrCreateSettings(branchId);
    const businessDate = formatDateInTimezone(
      new Date(),
      settings.timezone,
      "YYYY-MM-DD", // Business date format
    );
    const openDay = await this.businessDayRepository.findOpenDay({ branchId });

    if (openDay?.businessDate === businessDate) {
      throw new ConflictError("The business day is already open");
    }

    if (openDay && !dto.closePreviousDay) {
      throw new ConflictError(
        `The business day of ${openDay.businessDate} is still open. Close it before opening today.`,
        { code: ErrorCodes.PREVIOUS_BUSINESS_DAY_OPEN },
      );
    }

    const { day } = await this.businessDayRepository.openDay({
      organizationId,
      branchId,
      businessDate,
      performedBy: user.id,
      closeDayId: openDay?.id ?? null,
    });

    if (openDay) {
      await this.orderRepository.cancelUnpaidCounterOrders({
        businessDayId: openDay.id,
        reason:
          "The business day was closed before the order was paid at the counter",
      });
      await this.shiftRepository.closeBusinessDayShifts({
        businessDayId: openDay.id,
        endedBy: user.id,
        note: "Ended automatically when the business day was closed",
      });
    }

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
      throw new BadRequestError(
        "A branch must be selected to close its business day",
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
      throw new ConflictError("There is no open business day to close", {
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    await this.orderRepository.cancelUnpaidCounterOrders({
      businessDayId: closedDay.id,
      reason:
        "The business day was closed before the order was paid at the counter",
    });
    await this.shiftRepository.closeBusinessDayShifts({
      businessDayId: closedDay.id,
      endedBy: user.id,
      note: "Ended automatically when the business day was closed",
    });

    this.realtimeProvider.emitToBranch(
      branchId,
      SocketEventEnum.BUSINESS_DAY_CLOSED,
      { businessDayId: closedDay.id, businessDate: closedDay.businessDate },
    );

    return this.getCurrentBusinessDay({ effectiveTenant });
  }

  async setOrderingPaused(
    input: SetOrderingPausedServiceInput,
  ): Promise<SetOrderingPausedServiceResult> {
    const { effectiveTenant, user, isPaused } = input;
    const { branchId } = effectiveTenant;

    if (!branchId) {
      throw new BadRequestError(
        "A branch must be selected to pause or resume orders",
      );
    }

    const openDay = await this.businessDayRepository.findOpenDay({ branchId });
    if (!openDay) {
      throw new ConflictError("There is no open business day", {
        code: ErrorCodes.BUSINESS_DAY_CLOSED,
      });
    }

    const updatedDay = await this.businessDayRepository.setOrderingPaused({
      id: openDay.id,
      isPaused,
      performedBy: user.id,
    });

    if (!updatedDay) {
      throw new ConflictError(
        isPaused ? "Orders are already paused" : "Orders are not paused",
        { code: ErrorCodes.BAD_REQUEST },
      );
    }

    this.realtimeProvider.emitToBranch(
      branchId,
      isPaused
        ? SocketEventEnum.BUSINESS_DAY_ORDERS_PAUSED
        : SocketEventEnum.BUSINESS_DAY_ORDERS_RESUMED,
      { businessDayId: updatedDay.id, businessDate: updatedDay.businessDate },
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
      throw new BadRequestError(
        "A branch must be selected to view its business days",
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
      throw new NotFoundError("Business day not found");
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
      isOrderingPaused: openDay?.isOrderingPaused ?? false,
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
      throw new ConflictError("The branch is closed for orders right now", {
        code: ErrorCodes.BUSINESS_DAY_CLOSED,
      });
    }

    if (openDay.isOrderingPaused) {
      throw new ConflictError("The branch is not taking orders right now", {
        code: ErrorCodes.ORDERS_PAUSED,
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
