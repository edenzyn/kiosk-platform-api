import * as yup from "yup";
import { VALIDATION_CONSTANTS } from "../../../shared/constants/validation.constants";
import { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";
import { TenantPaymentMethodEnum } from "../../../shared/enums/finance/tenant-payment-method.enum";
import { paginationQuerySchema } from "../../../shared/validators/pagination.validator";

const nameSchema = yup
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters")
  .required("Name is required");

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

  static createPaymentProvider = yup
    .object({
      name: nameSchema,
      slug: yup
        .string()
        .trim()
        .lowercase()
        .min(
          VALIDATION_CONSTANTS.SLUG_MIN_LENGTH,
          `Slug must be at least ${VALIDATION_CONSTANTS.SLUG_MIN_LENGTH} characters`,
        )
        .max(
          VALIDATION_CONSTANTS.SLUG_MAX_LENGTH,
          `Slug cannot exceed ${VALIDATION_CONSTANTS.SLUG_MAX_LENGTH} characters`,
        )
        .matches(
          VALIDATION_CONSTANTS.SLUG_PATTERN,
          "Slug can only contain lowercase letters, numbers and hyphens",
        )
        .required("Slug is required"),
      mappings: yup
        .array()
        .of(yup.object(mappingBaseShape).noUnknown())
        .test(
          "unique-mappings",
          "Each market and payment method can only be mapped once",
          hasUniqueMappings,
        )
        .default([]),
    })
    .noUnknown();

  static updatePaymentProvider = yup
    .object({
      name: nameSchema,
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
