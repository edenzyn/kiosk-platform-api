import type { OrderTypeEnum } from "../../../shared/enums/order/order-type.enum";

export interface GetLiveOrderCountsQueryDto {
  orderType?: OrderTypeEnum;
}

/** Order counts of the branch's current business day, per status. */
export interface GetLiveOrderCountsResponseDto {
  placed: number;
  preparing: number;
  ready: number;
  completed: number;
}
