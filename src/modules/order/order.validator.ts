import * as yup from "yup";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { OrderPaymentStatusEnum } from "../../shared/enums/order/order-payment-status.enum";
import { OrderStatusEnum } from "../../shared/enums/order/order-status.enum";
import { dateIsAfterRef } from "../../shared/validators/date-range.validator";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";
import { TenantPaymentMethodEnum } from "../../shared/enums/finance/tenant-payment-method.enum";
import { OrderTypeEnum } from "../../shared/enums/order/order-type.enum";
import { numericEnumValidator } from "../../shared/validators/numeric-enum.validator";

export class OrderValidator {
  static createDeviceOrder = yup
    .object({
      idempotencyKey: yup
        .string()
        .trim()
        .max(100, "Idempotency key cannot exceed 100 characters")
        .required("Idempotency key is required"),
      orderType: numericEnumValidator(OrderTypeEnum, "Order type").required(
        "Order type is required",
      ),
      paymentMethod: numericEnumValidator(
        TenantPaymentMethodEnum,
        "Payment method",
      ).required("Payment method is required"),
      items: yup
        .array()
        .of(
          yup.object({
            menuItemId: yup
              .string()
              .uuid("Invalid menu item id")
              .required("Menu item is required"),
            quantity: yup
              .number()
              .typeError("Quantity must be a number")
              .integer("Quantity must be a whole number")
              .min(1, "Quantity must be at least 1")
              .max(99, "Quantity cannot exceed 99")
              .required("Quantity is required"),
            optionIds: yup
              .array()
              .of(yup.string().uuid("Invalid option id").required())
              .default([]),
          }),
        )
        .min(1, "Add at least one item")
        .max(50, "An order cannot have more than 50 lines")
        .required("Items are required"),
    })
    .noUnknown();

  static getOrdersQuery = paginationQuerySchema
    .shape({
      search: yup.string().trim().max(100).optional(),
      branchId: yup.string().uuid("Invalid branch id").optional(),
      createdFrom: yup.date().typeError("Invalid start date").optional(),
      createdTo: dateIsAfterRef("createdFrom").optional(),
      orderStatus: numericEnumValidator(
        OrderStatusEnum,
        "Order status",
      ).optional(),
      paymentStatus: numericEnumValidator(
        OrderPaymentStatusEnum,
        "Payment status",
      ).optional(),
      paymentMethod: numericEnumValidator(
        TenantPaymentMethodEnum,
        "Payment method",
      ).optional(),
      orderType: numericEnumValidator(OrderTypeEnum, "Order type").optional(),
      sortBy: yup
        .string()
        .oneOf(
          ["createdAt", "orderNumber", "totalAmount"],
          "Invalid sort field",
        )
        .optional(),
      sortOrder: yup
        .string()
        .oneOf(Object.values(SortingOrderEnum), "Invalid sort order")
        .optional(),
    })
    .noUnknown();

  static getLiveOrderCountsQuery = yup
    .object({
      orderType: numericEnumValidator(OrderTypeEnum, "Order type").optional(),
    })
    .noUnknown();
}
