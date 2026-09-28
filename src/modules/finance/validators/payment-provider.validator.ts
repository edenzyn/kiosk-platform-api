import * as yup from "yup";
import { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";
import { TenantPaymentMethodEnum } from "../../../shared/enums/finance/tenant-payment-method.enum";
import { paginationQuerySchema } from "../../../shared/validators/pagination.validator";

const mappingBaseShape = {
  marketId: yup
    .string()
    .uuid("Invalid market ID")
    .required("Market is required"),
  paymentMethod: yup
    .number()
    .typeError("Payment method must be a number")
    .oneOf(
      Object.values(TenantPaymentMethodEnum).filter(
        (v): v is number => typeof v === "number",
      ),
      "Invalid payment method",
    )
    .required("Payment method is required"),
};

const hasUniqueMappings = (
  mappings: Array<{ marketId?: string; paymentMethod?: number }> | undefined,
): boolean => {
  const keys = (mappings ?? []).map(
    (mapping) => `${mapping.marketId}:${mapping.paymentMethod}`,
  );
  return new Set(keys).size === keys.length;
};

export class PaymentProviderValidator {
  static getPaymentProvidersQuery = paginationQuerySchema
    .shape({
      search: yup.string().optional().trim(),
      isActive: yup.boolean().optional(),
      sortBy: yup
        .string()
        .oneOf(["name", "slug", "createdAt"])
        .optional(),
      sortOrder: yup
        .mixed<SortingOrderEnum>()
        .oneOf(Object.values(SortingOrderEnum))
        .optional(),
    })
    .noUnknown();

  static providerIdParam = yup
    .object({
      id: yup
        .string()
        .uuid("Invalid payment provider ID")
        .required("Payment provider ID is required"),
    })
    .noUnknown();

  static updatePaymentProvider = yup
    .object({
      mappings: yup
        .array()
        .of(
          yup
            .object({
              id: yup.string().uuid("Invalid mapping ID").optional(),
              ...mappingBaseShape,
              isActive: yup.boolean().default(true),
            })
            .noUnknown(),
        )
        .test(
          "unique-mappings",
          "Each market and payment method can only be mapped once",
          hasUniqueMappings,
        )
        .default([]),
    })
    .noUnknown();
}
