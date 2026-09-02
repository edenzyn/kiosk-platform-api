import * as Yup from "yup";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { emailValidator } from "../../shared/validators/email.validator";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";

export class OrganizationValidator {
  static readonly invite = Yup.object({
    organizationName: Yup.string()
      .trim()
      .min(2, "Organization name must be at least 2 characters")
      .max(255, "Organization name cannot exceed 255 characters")
      .required("Organization name is required"),
    name: Yup.string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .required("Owner name is required"),
    email: emailValidator("Invalid email address").required(
      "Owner email is required",
    ),
  }).noUnknown();

  static readonly getOrganizationsQuery = paginationQuerySchema
    .shape({
      search: Yup.string().optional().trim(),
      status: Yup.string().oneOf(["active", "inactive", "all"]).optional(),
      sortBy: Yup.string().oneOf(["name", "isActive", "createdAt"]).optional(),
      sortOrder: Yup.mixed<SortingOrderEnum>()
        .oneOf(Object.values(SortingOrderEnum))
        .optional(),
    })
    .noUnknown();

  static readonly organizationIdParam = Yup.object({
    id: Yup.string()
      .uuid("Invalid organization ID")
      .required("Organization ID is required"),
  }).noUnknown();

  static readonly getById = Yup.object({
    id: Yup.string().uuid("Invalid organization ID").required(),
  }).noUnknown();

  static readonly update = Yup.object({
    id: Yup.string().uuid("Invalid organization ID").required(),
    name: Yup.string().trim().min(2).max(255),
    isActive: Yup.boolean(),
  }).noUnknown();

  static readonly delete = Yup.object({
    id: Yup.string().uuid("Invalid organization ID").required(),
  }).noUnknown();

  static readonly updateMyOrganization = Yup.object({
    name: Yup.string().trim().min(2).max(255).optional(),
    registeredName: Yup.string().trim().max(255).nullable().optional(),
    registrationNumber: Yup.string().trim().max(100).nullable().optional(),
    country: Yup.string().max(100).nullable().optional(),
    state: Yup.string().max(100).nullable().optional(),
    city: Yup.string().max(100).nullable().optional(),
    postalCode: Yup.string().max(20).nullable().optional(),
    area: Yup.string().max(255).nullable().optional(),
    landmark: Yup.string().max(255).nullable().optional(),
    address: Yup.string().nullable().optional(),
  }).noUnknown();

  static readonly updateMyOrganizationSettings = Yup.object({
    primaryColor: Yup.string().trim().max(20).optional(),
    languageCode: Yup.string().trim().max(10).optional(),
    currencyCode: Yup.string().trim().max(3).optional(),
    timezone: Yup.string().trim().max(100).optional(),
  }).noUnknown();
}
