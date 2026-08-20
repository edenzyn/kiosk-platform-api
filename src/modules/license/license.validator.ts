import * as yup from "yup";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../shared/enums/license/license-discount-rule-target-entity-type.enum";
import { LicenseDiscountTypeEnum } from "../../shared/enums/license/license-discount-type.enum";
import { LicenseRedemptionStatusEnum } from "../../shared/enums/license/license-redemption-status.enum";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";

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
      branchId: yup.string().uuid().optional(),
      sortBy: yup.string().optional(),
      sortOrder: yup
        .string()
        .oneOf(Object.values(SortingOrderEnum), "Invalid sort order")
        .optional(),
    })
    .noUnknown(),
  purchaseLicense: yup
    .object({
      quantity: yup
        .number()
        .typeError("Quantity must be a number")
        .integer("Quantity must be an integer")
        .min(1, "Quantity must be at least 1")
        .required("Quantity is required"),
      pricingPlanId: yup.string().uuid().required("Pricing plan is required"),
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
  getPricingPlansQuery: yup
    .object({
      id: yup.string().uuid().optional(),
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
      pricingPlanIds: yup
        .array()
        .of(yup.string().uuid().required())
        .when("targetEntity", {
          is: LicenseDiscountRuleTargetEntityTypeEnum.LICENSE_PLAN_INDIVIDUAL,
          then: (schema) =>
            schema
              .min(1, "Select at least one pricing plan")
              .required("Select at least one pricing plan"),
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
  getPlatformPricingPlansQuery: yup
    .object({
      isActive: yup.boolean().optional(),
    })
    .noUnknown(),
  createPricingPlan: yup
    .object({
      name: yup
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(255, "Name cannot exceed 255 characters")
        .required("Name is required"),
      durationDays: yup
        .number()
        .typeError("Duration must be a number")
        .integer("Duration must be an integer")
        .min(1, "Duration must be at least 1 day")
        .required("Duration is required"),
      price: yup
        .number()
        .typeError("Price must be a number")
        .min(0, "Price cannot be negative")
        .required("Price is required"),
      currency: yup
        .string()
        .trim()
        .uppercase()
        .length(3, "Currency must be a 3-letter ISO code")
        .required("Currency is required"),
    })
    .noUnknown(),
  pricingPlanIdParam: yup
    .object({
      id: yup
        .string()
        .uuid("Invalid pricing plan ID")
        .required("Pricing plan ID is required"),
    })
    .noUnknown(),
  extendLicense: yup
    .object({
      pricingPlanId: yup.string().uuid().required("Pricing plan ID is required"),
    })
    .noUnknown(),
  licenseIdParam: yup
    .object({
      id: yup.string().uuid("Invalid license ID").required("License ID is required"),
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
      currency: yup
        .string()
        .trim()
        .uppercase()
        .length(3, "Currency must be a 3-letter ISO code")
        .required("Currency is required"),
      items: yup
        .array()
        .of(
          yup
            .object({
              licenseId: yup.string().uuid().required(),
              soldPrice: yup
                .number()
                .typeError("Sold price must be a number")
                .min(0, "Sold price cannot be negative")
                .required("Sold price is required"),
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
