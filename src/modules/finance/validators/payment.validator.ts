import * as yup from "yup";
import { SortingOrderEnum } from "../../../shared/enums/core/sorting-order.enum";
import { PaymentProviderSlugEnum } from "../../../shared/enums/finance/payment-provider-slug.enum";
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

const secretField = (key: string, label: string) =>
  yup
    .string()
    .trim()
    .max(500, `${label} cannot exceed 500 characters`)
    .when("$storedSecretKeys", ([storedSecretKeys], schema) =>
      (storedSecretKeys as string[] | undefined)?.includes(key)
        ? schema.optional()
        : schema.required(`${label} is required`),
    );

const textField = (label: string) =>
  yup
    .string()
    .trim()
    .max(255, `${label} cannot exceed 255 characters`)
    .required(`${label} is required`);

const numericField = (label: string) =>
  yup
    .string()
    .trim()
    .matches(/^\d+$/, `${label} must be a number`)
    .max(20, `${label} cannot exceed 20 digits`)
    .required(`${label} is required`);

export class PaymentValidator {
  static getPaymentProvidersQuery = paginationQuerySchema
    .shape({
      search: yup.string().optional().trim(),
      isActive: yup.boolean().optional(),
      sortBy: yup.string().oneOf(["name", "slug", "createdAt"]).optional(),
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

  // ========================================
  // ? TENANT PAYMENT CONFIGS
  // ========================================
  static saveTenantPaymentConfig = yup
    .object({
      mapperId: yup
        .string()
        .uuid("Invalid payment provider")
        .required("Payment provider is required"),
      isActive: yup.boolean().required("Enabled flag is required"),
      config: yup
        .mixed<Record<string, unknown>>()
        .test(
          "is-object",
          "Config must be an object",
          (value) =>
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value),
        )
        .required("Config is required"),
    })
    .noUnknown();

  static saveCashPaymentConfig = yup
    .object({
      isEnabled: yup.boolean().required("Enabled flag is required"),
    })
    .noUnknown();

  static testTenantPaymentConfig = yup
    .object({
      mapperId: yup
        .string()
        .uuid("Invalid payment provider")
        .required("Payment provider is required"),
      config: yup
        .mixed<Record<string, unknown>>()
        .test(
          "is-object",
          "Config must be an object",
          (value) =>
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value),
        )
        .required("Config is required"),
    })
    .noUnknown();

  // Config models by provider slug and payment method.
  static paymentConfigs: Record<
    string,
    Partial<Record<TenantPaymentMethodEnum, yup.AnyObjectSchema>>
  > = {
    [PaymentProviderSlugEnum.PHONEPE]: {
      [TenantPaymentMethodEnum.QR]: yup
        .object({
          clientId: textField("Client ID"),
          clientSecret: secretField("clientSecret", "Client secret"),
          clientVersion: numericField("Client version"),
        })
        .noUnknown(),
    },
    [PaymentProviderSlugEnum.PINE_LABS]: {
      [TenantPaymentMethodEnum.CARD]: yup
        .object({
          merchantId: textField("Merchant ID"),
          securityToken: secretField("securityToken", "Security token"),
        })
        .noUnknown(),
    },
  };
}
