import * as yup from "yup";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { LicenseDiscountRuleTargetEntityTypeEnum } from "../../shared/enums/license/license-discount-rule-target-entity-type.enum";

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
};
