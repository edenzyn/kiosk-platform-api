import * as yup from "yup";
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
}
