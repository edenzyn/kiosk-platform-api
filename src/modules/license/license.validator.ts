import * as yup from "yup";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";

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
        .default(1)
        .optional(),
      branchId: yup.string().uuid().optional(),
    })
    .noUnknown(),
};
