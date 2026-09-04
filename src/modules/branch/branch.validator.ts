import * as yup from "yup";
import { emailValidator } from "../../shared/validators/email.validator";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";
import validateMobileNumber from "../../shared/validators/phone.validator";

import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";

export const BranchValidator = {
  create: yup.object({
    organizationId: yup.string().uuid().required("Organization ID is required"),
    name: yup.string().max(255).required("Branch name is required"),
    email: emailValidator("Invalid email").nullable().optional(),
    mobile: yup
      .string()
      .max(50, "Mobile number must be less than 50 characters")
      .nullable()
      .optional()
      .test("is-mobile", "Invalid mobile number", (value) => {
        if (!value) return true;
        return validateMobileNumber(value);
      }),
    country: yup.string().max(100).required("Country is required"),
    state: yup.string().max(100).required("State / Province is required"),
    city: yup.string().max(100).required("City is required"),
    postalCode: yup.string().max(20).required("Postal / ZIP Code is required"),
    area: yup.string().max(255).nullable().optional(),
    landmark: yup.string().max(255).nullable().optional(),
    address: yup.string().required("Street Address is required"),
    latitude: yup.number().nullable().optional(),
    longitude: yup.number().nullable().optional(),
  }),
  update: yup
    .object({
      id: yup.string().uuid().required("Branch ID is required"),
      name: yup.string().max(255).optional(),
      email: emailValidator("Invalid email").nullable().optional(),
      mobile: yup
        .string()
        .max(50, "Mobile number must be less than 50 characters")
        .nullable()
        .optional()
        .test("is-mobile", "Invalid mobile number", (value) => {
          if (!value) return true;
          return validateMobileNumber(value);
        }),
      country: yup.string().max(100).optional(),
      state: yup.string().max(100).optional(),
      city: yup.string().max(100).optional(),
      postalCode: yup.string().max(20).optional(),
      area: yup.string().max(255).nullable().optional(),
      landmark: yup.string().max(255).nullable().optional(),
      address: yup.string().optional(),
      latitude: yup.number().nullable().optional(),
      longitude: yup.number().nullable().optional(),
    })
    .noUnknown(),
  getBranchesQuery: paginationQuerySchema
    .shape({
      search: yup.string().optional(),
      isActive: yup.boolean().optional(),
      sortBy: yup.string().optional(),
      sortOrder: yup
        .string()
        .oneOf(Object.values(SortingOrderEnum), "Invalid sort order")
        .optional(),
    })
    .noUnknown(),
  updateDetails: yup
    .object({
      name: yup.string().max(255).optional(),
      email: emailValidator("Invalid email").nullable().optional(),
      mobile: yup
        .string()
        .max(50, "Mobile number must be less than 50 characters")
        .nullable()
        .optional()
        .test("is-mobile", "Invalid mobile number", (value) => {
          if (!value) return true;
          return validateMobileNumber(value);
        }),
      country: yup.string().max(100).optional(),
      state: yup.string().max(100).optional(),
      city: yup.string().max(100).optional(),
      postalCode: yup.string().max(20).optional(),
      area: yup.string().max(255).nullable().optional(),
      landmark: yup.string().max(255).nullable().optional(),
      address: yup.string().optional(),
    })
    .noUnknown(),
  updateSettings: yup
    .object({
      primaryColor: yup.string().trim().max(20).optional(),
      languageCode: yup.string().trim().max(10).optional(),
      currencyCode: yup.string().trim().max(3).optional(),
      timezone: yup.string().trim().max(100).optional(),
      logo: yup.string().trim().max(255).nullable().optional(),
    })
    .noUnknown(),
  requestBrandLogoUpload: yup
    .object({
      contentType: yup.string().required("File content type is required"),
      fileSize: yup
        .number()
        .integer()
        .positive()
        .required("File size is required"),
    })
    .noUnknown(),
  finalizeBrandLogoUpload: yup
    .object({
      logo: yup.string().trim().max(255).required("Logo key is required"),
    })
    .noUnknown(),
};
