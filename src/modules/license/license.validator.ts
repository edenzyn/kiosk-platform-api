import * as yup from "yup";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { DeviceTypeEnum } from "../../shared/enums/device/device-type.enum";
import { LicenseDiscountRuleScopeTypeEnum } from "../../shared/enums/license/license-discount-rule-scope-type.enum";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import { LicenseDiscountTypeEnum } from "../../shared/enums/license/license-discount-type.enum";
import { LicenseRedemptionStatusEnum } from "../../shared/enums/license/license-redemption-status.enum";
import { emailValidator } from "../../shared/validators/email.validator";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";

const billingInfoSchema = yup
  .object({
    name: yup
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(255, "Name cannot exceed 255 characters")
      .required("Billing name is required"),
    email: emailValidator().required("Billing email is required"),
    phone: yup
      .string()
      .trim()
      .max(30, "Phone number cannot exceed 30 characters")
      .required("Billing phone is required"),
    address: yup
      .string()
      .trim()
      .max(1000, "Address cannot exceed 1000 characters")
      .required("Billing address is required"),
    city: yup
      .string()
      .trim()
      .max(100, "City cannot exceed 100 characters")
      .required("City is required"),
    state: yup
      .string()
      .trim()
      .max(100, "State cannot exceed 100 characters")
      .required("State is required"),
    postalCode: yup
      .string()
      .trim()
      .max(20, "Postal code cannot exceed 20 characters")
      .required("Postal code is required"),
    country: yup
      .string()
      .trim()
      .length(2, "Country must be a 2-letter ISO code")
      .required("Country is required"),
    taxId: yup
      .string()
      .trim()
      .max(50, "Tax ID cannot exceed 50 characters")
      .optional(),
  })
  .required();

export const LicenseValidator = {
  activate: yup.object({
    licenseKey: yup
      .string()
      .trim()
      .required("License key is required"),
  }),
  getLicensesQuery: paginationQuerySchema
    .shape({
      search: yup.string().optional(),
      status: yup
        .number()
        .typeError("Status must be a number")
        .integer("Status must be an integer")
        .optional(),
      deviceType: yup
        .number()
        .typeError("Device type must be a number")
        .oneOf(Object.values(DeviceTypeEnum) as number[], "Invalid device type")
        .optional(),
      branchId: yup.string().uuid().optional(),
      sortBy: yup.string().optional(),
      sortOrder: yup
        .string()
        .oneOf(Object.values(SortingOrderEnum), "Invalid sort order")
        .optional(),
    })
    .noUnknown(),
  initiateLicensePurchaseAsReseller: yup
    .object({
      quantity: yup
        .number()
        .typeError("Quantity must be a number")
        .integer("Quantity must be an integer")
        .min(1, "Quantity must be at least 1")
        .required("Quantity is required"),
      licensePlanId: yup.string().uuid().required("License plan is required"),
      discountRuleId: yup.string().uuid().optional(),
      marketId: yup.string().uuid().required("Market is required"),
      billingInfo: billingInfoSchema.required("Billing information is required"),
    })
    .noUnknown(),
  verifyLicensePurchaseAsReseller: yup
    .object({
      quantity: yup
        .number()
        .typeError("Quantity must be a number")
        .integer("Quantity must be an integer")
        .min(1, "Quantity must be at least 1")
        .required("Quantity is required"),
      licensePlanId: yup.string().uuid().required("License plan is required"),
      discountRuleId: yup.string().uuid().optional(),
      marketId: yup.string().uuid().required("Market is required"),
      billingInfo: billingInfoSchema.required("Billing information is required"),
      razorpayOrderId: yup
        .string()
        .trim()
        .required("Razorpay order id is required"),
      razorpayPaymentId: yup
        .string()
        .trim()
        .required("Razorpay payment id is required"),
      razorpaySignature: yup
        .string()
        .trim()
        .required("Razorpay signature is required"),
    })
    .noUnknown(),
  cancelLicensePurchase: yup
    .object({
      razorpayOrderId: yup
        .string()
        .trim()
        .required("Razorpay order id is required"),
      reason: yup.string().trim().optional(),
    })
    .noUnknown(),
  initiateLicensePurchase: yup
    .object({
      quantity: yup
        .number()
        .typeError("Quantity must be a number")
        .integer("Quantity must be an integer")
        .min(1, "Quantity must be at least 1")
        .required("Quantity is required"),
      licensePlanId: yup.string().uuid().required("License plan is required"),
      discountRuleId: yup.string().uuid().optional(),
      marketId: yup.string().uuid().optional(),
      billingInfo: billingInfoSchema.required("Billing information is required"),
    })
    .noUnknown(),
  verifyLicensePurchase: yup
    .object({
      quantity: yup
        .number()
        .typeError("Quantity must be a number")
        .integer("Quantity must be an integer")
        .min(1, "Quantity must be at least 1")
        .required("Quantity is required"),
      licensePlanId: yup.string().uuid().required("License plan is required"),
      discountRuleId: yup.string().uuid().optional(),
      marketId: yup.string().uuid().optional(),
      billingInfo: billingInfoSchema.required("Billing information is required"),
      razorpayOrderId: yup
        .string()
        .trim()
        .required("Razorpay order id is required"),
      razorpayPaymentId: yup
        .string()
        .trim()
        .required("Razorpay payment id is required"),
      razorpaySignature: yup
        .string()
        .trim()
        .required("Razorpay signature is required"),
    })
    .noUnknown(),
  redeemLicenseCode: yup
    .object({
      redeemCode: yup.string().trim().required("Redeem code is required"),
    })
    .noUnknown(),
  assignToBranch: yup
    .object({
      branchId: yup.string().uuid().required("Branch ID is required"),
    })
    .noUnknown(),
  assignToDevice: yup
    .object({
      deviceId: yup.string().uuid().required("Device ID is required"),
    })
    .noUnknown(),
  getLicensePlansQuery: yup
    .object({
      id: yup.string().uuid().optional(),
      marketId: yup.string().uuid().optional(),
    })
    .noUnknown(),
  getDiscountRulesQuery: yup
    .object({
      targetEntity: yup
        .number()
        .typeError("Target entity must be a number")
        .oneOf(
          Object.values(LicenseDiscountRuleTargetEntityTypeEnum) as number[],
          "Invalid target entity",
        )
        .required("Target entity is required"),
      marketId: yup.string().uuid().optional(),
    })
    .noUnknown(),
  getPlatformDiscountRulesQuery: paginationQuerySchema
    .shape({
      search: yup.string().optional().trim(),
      targetEntity: yup
        .number()
        .typeError("Target entity must be a number")
        .oneOf(
          Object.values(LicenseDiscountRuleTargetEntityTypeEnum) as number[],
          "Invalid target entity",
        )
        .optional(),
      isActive: yup.boolean().optional(),
      marketId: yup.string().uuid().optional(),
      discountType: yup
        .number()
        .typeError("Discount type must be a number")
        .oneOf(Object.values(LicenseDiscountTypeEnum) as number[], "Invalid discount type")
        .optional(),
      sortBy: yup
        .string()
        .oneOf(["name", "discountValue", "createdAt"])
        .optional(),
      sortOrder: yup
        .string()
        .oneOf(Object.values(SortingOrderEnum), "Invalid sort order")
        .optional(),
    })
    .noUnknown(),
  createDiscountRule: yup
    .object({
      name: yup
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(255, "Name cannot exceed 255 characters")
        .required("Name is required"),
      targetEntity: yup
        .number()
        .typeError("Target entity must be a number")
        .oneOf(
          Object.values(LicenseDiscountRuleTargetEntityTypeEnum) as number[],
          "Invalid target entity",
        )
        .required("Target entity is required"),
      discountType: yup
        .number()
        .typeError("Discount type must be a number")
        .oneOf(
          Object.values(LicenseDiscountTypeEnum) as number[],
          "Invalid discount type",
        )
        .required("Discount type is required"),
      discountValue: yup
        .number()
        .typeError("Discount value must be a number")
        .moreThan(0, "Discount value must be greater than 0")
        .test(
          "max-percentage",
          "Percentage discount cannot exceed 100",
          function (value) {
            if (value === undefined || value === null) return true;
            const { discountType } = this.parent as { discountType?: number };
            if (discountType === LicenseDiscountTypeEnum.PERCENTAGE) {
              return value <= 100;
            }
            return true;
          },
        )
        .required("Discount value is required"),
      scopeType: yup
        .number()
        .typeError("Scope type must be a number")
        .oneOf(
          Object.values(LicenseDiscountRuleScopeTypeEnum) as number[],
          "Invalid scope type",
        )
        .test(
          "flat-must-be-market",
          "A flat discount must be market-scoped",
          function (value) {
            const { discountType } = this.parent as { discountType?: number };
            if (discountType === LicenseDiscountTypeEnum.FLAT) {
              return value === LicenseDiscountRuleScopeTypeEnum.MARKET;
            }
            return true;
          },
        )
        .required("Scope type is required"),
      marketId: yup
        .string()
        .uuid()
        .when(["scopeType", "discountType"], {
          is: (scopeType: number, discountType: number) =>
            scopeType === LicenseDiscountRuleScopeTypeEnum.MARKET ||
            discountType === LicenseDiscountTypeEnum.FLAT,
          then: (schema) => schema.required("Market is required"),
          otherwise: (schema) => schema.strip(),
        }),
      minQuantity: yup
        .number()
        .typeError("Minimum quantity must be a number")
        .integer("Minimum quantity must be an integer")
        .min(1, "Minimum quantity must be at least 1")
        .default(1),
      maxQuantity: yup
        .number()
        .typeError("Maximum quantity must be a number")
        .integer("Maximum quantity must be an integer")
        .nullable()
        .optional()
        .test(
          "max-gte-min",
          "Maximum quantity must be greater than or equal to minimum quantity",
          function (value) {
            if (value === null || value === undefined) return true;
            const { minQuantity } = this.parent as { minQuantity?: number };
            return minQuantity === undefined || value >= minQuantity;
          },
        ),
      startsAt: yup.date().nullable().optional(),
      endsAt: yup
        .date()
        .nullable()
        .optional()
        .test(
          "ends-after-starts",
          "End date must be after start date",
          function (value) {
            if (!value) return true;
            const { startsAt } = this.parent as { startsAt?: Date | null };
            return !startsAt || value > startsAt;
          },
        ),
      resellerIds: yup
        .array()
        .of(yup.string().uuid().required())
        .when("targetEntity", {
          is: LicenseDiscountRuleTargetEntityTypeEnum.RESELLER_INDIVIDUAL,
          then: (schema) =>
            schema
              .min(1, "Select at least one reseller")
              .required("Select at least one reseller"),
          otherwise: (schema) => schema.strip(),
        }),
      licensePlanIds: yup
        .array()
        .of(yup.string().uuid().required())
        .when("targetEntity", {
          is: LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL,
          then: (schema) =>
            schema
              .min(1, "Select at least one license plan")
              .required("Select at least one license plan"),
          otherwise: (schema) => schema.strip(),
        }),
    })
    .noUnknown(),
  discountRuleIdParam: yup
    .object({
      id: yup
        .string()
        .uuid("Invalid discount rule ID")
        .required("Discount rule ID is required"),
    })
    .noUnknown(),
  getPlatformLicensePlansQuery: paginationQuerySchema
    .shape({
      search: yup.string().optional().trim(),
      isActive: yup.boolean().optional(),
      marketId: yup.string().uuid().optional(),
    })
    .noUnknown(),
  createLicensePlan: yup
    .object({
      name: yup
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(255, "Name cannot exceed 255 characters")
        .required("Name is required"),
      deviceType: yup
        .number()
        .typeError("Device type must be a number")
        .oneOf(Object.values(DeviceTypeEnum) as number[], "Invalid device type")
        .required("Device type is required"),
      durationDays: yup
        .number()
        .typeError("Duration must be a number")
        .integer("Duration must be an integer")
        .min(1, "Duration must be at least 1 day")
        .required("Duration is required"),
      marketPrices: yup
        .array()
        .of(
          yup
            .object({
              marketId: yup.string().uuid().required(),
              price: yup
                .number()
                .typeError("Price must be a number")
                .positive("Price must be greater than 0")
                .required(),
            })
            .required(),
        )
        .min(1, "At least one market price is required")
        .required("Market prices are required"),
    })
    .noUnknown(),
  updateLicensePlan: yup
    .object({
      name: yup
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(255, "Name cannot exceed 255 characters")
        .required("Name is required"),
      deviceType: yup
        .number()
        .typeError("Device type must be a number")
        .oneOf(Object.values(DeviceTypeEnum) as number[], "Invalid device type")
        .required("Device type is required"),
      durationDays: yup
        .number()
        .typeError("Duration must be a number")
        .integer("Duration must be an integer")
        .min(1, "Duration must be at least 1 day")
        .required("Duration is required"),
      marketPrices: yup
        .array()
        .of(
          yup
            .object({
              marketId: yup.string().uuid().required(),
              price: yup
                .number()
                .typeError("Price must be a number")
                .positive("Price must be greater than 0")
                .required(),
            })
            .required(),
        )
        .optional(),
    })
    .noUnknown(),
  licensePlanIdParam: yup
    .object({
      id: yup
        .string()
        .uuid("Invalid license plan ID")
        .required("License plan ID is required"),
    })
    .noUnknown(),
  initiateLicenseExtend: yup
    .object({
      licensePlanId: yup.string().uuid(),
    })
    .noUnknown(),
  verifyLicenseExtend: yup
    .object({
      licensePlanId: yup.string().uuid(),
      razorpayOrderId: yup
        .string()
        .trim()
        .required("Razorpay order id is required"),
      razorpayPaymentId: yup
        .string()
        .trim()
        .required("Razorpay payment id is required"),
      razorpaySignature: yup
        .string()
        .trim()
        .required("Razorpay signature is required"),
    })
    .noUnknown(),
  licenseIdParam: yup
    .object({
      id: yup.string().uuid("Invalid license ID").required("License ID is required"),
    })
    .noUnknown(),
  getLicenseTransactionsQuery: paginationQuerySchema.noUnknown(),
  transactionIdParam: yup
    .object({
      id: yup
        .string()
        .uuid("Invalid transaction ID")
        .required("Transaction ID is required"),
    })
    .noUnknown(),
  generateRedemptionCode: yup
    .object({
      licenseIds: yup
        .array()
        .of(yup.string().uuid().required())
        .min(1, "Select at least one license")
        .required("At least one license is required"),
      redeemExpiresAt: yup.date().nullable().optional(),
      remarks: yup.string().trim().max(500, "Remarks cannot exceed 500 characters").optional(),
    })
    .noUnknown(),
  verifyRedemptionCode: yup
    .object({
      totalSoldPrice: yup
        .number()
        .typeError("Total sold price must be a number")
        .min(0, "Total sold price cannot be negative")
        .required("Total sold price is required"),
      items: yup
        .array()
        .of(
          yup
            .object({
              licenseId: yup.string().uuid().required(),
              lockedPrice: yup
                .number()
                .typeError("Locked price must be a number")
                .min(0, "Locked price cannot be negative")
                .required("Locked price is required"),
            })
            .required(),
        )
        .min(1, "At least one license price is required")
        .required("Item prices are required"),
    })
    .noUnknown(),
  getRedemptionCodesQuery: paginationQuerySchema
    .shape({
      search: yup.string().optional().trim(),
      status: yup
        .number()
        .typeError("Status must be a number")
        .oneOf(Object.values(LicenseRedemptionStatusEnum) as number[], "Invalid status")
        .optional(),
      sortBy: yup
        .string()
        .oneOf(["generatedAt", "redeemExpiresAt", "status"])
        .optional(),
      sortOrder: yup
        .string()
        .oneOf(Object.values(SortingOrderEnum), "Invalid sort order")
        .optional(),
    })
    .noUnknown(),
  redemptionCodeIdParam: yup
    .object({
      id: yup
        .string()
        .uuid("Invalid redemption code ID")
        .required("Redemption code ID is required"),
    })
    .noUnknown(),
};
