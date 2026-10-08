import * as yup from "yup";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { OrderDateFilterEnum } from "../../shared/enums/order/order-date-filter.enum";
import { OrderPaymentStatusEnum } from "../../shared/enums/order/order-payment-status.enum";
import { OrderStatusEnum } from "../../shared/enums/order/order-status.enum";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";
import { TenantPaymentMethodEnum } from "../../shared/enums/finance/tenant-payment-method.enum";
import { OrderTypeEnum } from "../../shared/enums/order/order-type.enum";
import { numericEnumValidator } from "../../shared/validators/numeric-enum.validator";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The business date is a calendar day; every other order date is a moment in time. */
const isValidOrderDate = (
  value: string | undefined,
  dateField?: OrderDateFilterEnum,
): boolean => {
  if (!value) return true;

  return dateField === OrderDateFilterEnum.BUSINESS_DATE
    ? BUSINESS_DATE_PATTERN.test(value)
    : !Number.isNaN(Date.parse(value));
};

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
      isPayAtCounter: yup
        .boolean()
        .typeError("isPayAtCounter must be true or false")
        .default(false),
      paymentMethod: numericEnumValidator(
        TenantPaymentMethodEnum,
        "Payment method",
      ).when("isPayAtCounter", {
        is: true,
        then: (schema) => schema.strip(),
        otherwise: (schema) => schema.required("Payment method is required"),
      }),
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

  static orderIdParams = yup
    .object({
      id: yup
        .string()
        .uuid("Invalid order id")
        .required("Order ID is required"),
    })
    .noUnknown();

  static getPendingPaymentOrdersQuery = paginationQuerySchema
    .shape({
      search: yup.string().trim().max(100).optional(),
    })
    .noUnknown();

  static collectPendingPayment = yup
    .object({
      paymentMethod: numericEnumValidator(
        TenantPaymentMethodEnum,
        "Payment method",
      ).required("Payment method is required"),
    })
    .noUnknown();

  static changeKdsOrderStatus = yup
    .object({
      orderStatus: numericEnumValidator(OrderStatusEnum, "Order status", {
        exclude: [
          OrderStatusEnum.PENDING_PAYMENT,
          OrderStatusEnum.PLACED,
          OrderStatusEnum.CANCELLED,
        ],
      }).required("Order status is required"),
    })
    .noUnknown();

  static getOrdersQuery = paginationQuerySchema
    .shape({
      search: yup.string().trim().max(100).optional(),
      branchId: yup.string().uuid("Invalid branch id").optional(),
      dateField: yup
        .string()
        .oneOf(Object.values(OrderDateFilterEnum), "Invalid date field")
        .optional(),
      dateFrom: yup
        .string()
        .trim()
        .test("is-valid-date", "Invalid start date", function (value) {
          return isValidOrderDate(value, this.parent.dateField);
        })
        .optional(),
      dateTo: yup
        .string()
        .trim()
        .test("is-valid-date", "Invalid end date", function (value) {
          return isValidOrderDate(value, this.parent.dateField);
        })
        .test(
          "is-on-or-after-start",
          "End date cannot be before start date",
          function (value) {
            const { dateField, dateFrom } = this.parent as {
              dateField?: OrderDateFilterEnum;
              dateFrom?: string;
            };
            if (!value || !dateFrom) return true;

            return dateField === OrderDateFilterEnum.BUSINESS_DATE
              ? value >= dateFrom
              : new Date(value) >= new Date(dateFrom);
          },
        )
        .optional(),
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
          ["createdAt", "businessDate", "orderNumber", "totalAmount"],
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
