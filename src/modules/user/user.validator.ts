import * as Yup from "yup";
import { emailValidator } from "../../shared/validators/email.validator";
import { stringToArray } from "../../shared/validators/yup.transformer";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";

export class UserValidator {
  static inviteUser = Yup.object({
    name: Yup.string().required("Name is required").trim().min(2).max(100),
    email: emailValidator("Invalid email address").required(
      "Email is required",
    ),
    roles: stringToArray().of(Yup.string().required()).default([]),
    branchId: Yup.string().uuid("Invalid branch ID format").nullable().optional(),
  }).noUnknown();

  static revokeInvitation = Yup.object({
    id: Yup.string()
      .uuid("Invalid invitation ID format")
      .required("Invitation ID is required"),
  }).noUnknown();

  static resendInvitation = Yup.object({
    id: Yup.string()
      .uuid("Invalid invitation ID format")
      .required("Invitation ID is required"),
  }).noUnknown();

  static getUsersQuery = paginationQuerySchema.shape({
    search: Yup.string().optional().trim(),
    sortBy: Yup.string().oneOf(["name", "userType", "isActive", "createdAt"]).optional().default("createdAt"),
    sortOrder: Yup.mixed<SortingOrderEnum>().oneOf(Object.values(SortingOrderEnum)).optional().default(SortingOrderEnum.DESC),
  }).noUnknown();

  static getInvitationsQuery = paginationQuerySchema.shape({
    search: Yup.string().optional().trim(),
    sortBy: Yup.string().oneOf(["email", "status", "expiresAt", "createdAt"]).optional().default("createdAt"),
    sortOrder: Yup.mixed<SortingOrderEnum>().oneOf(Object.values(SortingOrderEnum)).optional().default(SortingOrderEnum.DESC),
  }).noUnknown();
}
