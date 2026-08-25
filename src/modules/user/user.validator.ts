import * as Yup from "yup";
import { OTP_CONSTANTS } from "../../shared/constants/otp.constants";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { ThemeModeEnums } from "../../shared/enums/theme/theme-mode.enum";
import { TwoFactorMethodEnums } from "../../shared/enums/user/two-factor-method.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { dateIsAfterRef } from "../../shared/validators/date-range.validator";
import { emailValidator } from "../../shared/validators/email.validator";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";
import { passwordValidator } from "../../shared/validators/password.validator";
import validateMobileNumber from "../../shared/validators/phone.validator";
import { stringToArray } from "../../shared/validators/yup.transformer";

const TWO_FACTOR_METHOD_VALUES = Object.values(TwoFactorMethodEnums).filter(
  (value): value is TwoFactorMethodEnums => typeof value === "number",
);

export class UserValidator {
  static inviteUser = Yup.object({
    name: Yup.string().required("Name is required").trim().min(2).max(100),
    email: emailValidator("Invalid email address").required(
      "Email is required",
    ),
    roles: stringToArray().of(Yup.string().required()).default([]),
    branchId: Yup.string()
      .uuid("Invalid branch ID format")
      .nullable()
      .optional(),
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

  static updateSettings = Yup.object({
    themeMode: Yup.mixed<ThemeModeEnums>()
      .oneOf(Object.values(ThemeModeEnums))
      .optional(),
    primaryColor: Yup.string()
      .trim()
      .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid color format")
      .optional(),
    languageCode: Yup.string().trim().min(2).max(10).optional(),
    timezone: Yup.string().trim().min(1).max(100).optional(),
    currencyCode: Yup.string().trim().length(3).optional(),
  }).noUnknown();

  static sessionIdParam = Yup.object({
    sessionId: Yup.string()
      .uuid("Invalid session ID format")
      .required("Session ID is required"),
  }).noUnknown();

  static changePassword = Yup.object({
    currentPassword: passwordValidator().required(
      "Current password is required",
    ),
    newPassword: passwordValidator()
      .required("New password is required")
      .notOneOf(
        [Yup.ref("currentPassword")],
        "New password must be different from your current password",
      ),
  }).noUnknown();

  static setupTwoFactor = Yup.object({
    method: Yup.mixed<TwoFactorMethodEnums>()
      .oneOf(TWO_FACTOR_METHOD_VALUES, "Choose a valid method")
      .required("Method is required"),
  }).noUnknown();

  static enableTwoFactor = Yup.object({
    otpToken: Yup.string().required("Verification session is required"),
    code: Yup.string()
      .trim()
      .length(OTP_CONSTANTS.CODE_LENGTH, "Enter a valid code")
      .required("Code is required"),
  }).noUnknown();

  static disableTwoFactor = Yup.object({
    password: passwordValidator().required("Password is required"),
  }).noUnknown();

  static updateProfile = Yup.object({
    name: Yup.string().required("Name is required").trim().min(2).max(100),
  }).noUnknown();

  static requestEmailChange = Yup.object({
    newEmail: emailValidator("Invalid email address").required(
      "Email is required",
    ),
  }).noUnknown();

  static requestMobileChange = Yup.object({
    newMobile: Yup.string()
      .trim()
      .max(20, "Mobile number must be less than 20 characters")
      .required("Mobile number is required")
      .test("is-mobile", "Invalid mobile number", (value) => {
        if (!value) return true;
        return validateMobileNumber(value);
      }),
  }).noUnknown();

  static confirmContactChange = Yup.object({
    changeToken: Yup.string().required("Verification session is required"),
    code: Yup.string()
      .trim()
      .length(OTP_CONSTANTS.CODE_LENGTH, "Enter a valid code")
      .required("Code is required"),
  }).noUnknown();

  static getUsersQuery = paginationQuerySchema
    .shape({
      search: Yup.string().optional().trim(),
      sortBy: Yup.string()
        .oneOf(["name", "userType", "isActive", "createdAt"])
        .optional()
        .default("createdAt"),
      sortOrder: Yup.mixed<SortingOrderEnum>()
        .oneOf(Object.values(SortingOrderEnum))
        .optional()
        .default(SortingOrderEnum.DESC),
    })
    .noUnknown();

  static getInvitationsQuery = paginationQuerySchema
    .shape({
      search: Yup.string().optional().trim(),
      sortBy: Yup.string()
        .oneOf(["email", "status", "expiresAt", "createdAt"])
        .optional()
        .default("createdAt"),
      sortOrder: Yup.mixed<SortingOrderEnum>()
        .oneOf(Object.values(SortingOrderEnum))
        .optional()
        .default(SortingOrderEnum.DESC),
      status: Yup.number()
        .oneOf(
          Object.values(UserInvitationStatusEnum) as number[],
          "Invalid status",
        )
        .optional(),
      expiresStart: Yup.date().typeError("Invalid start date").optional(),
      expiresEnd: dateIsAfterRef(
        "expiresStart",
        "End date cannot be before start date",
      )
        .typeError("Invalid end date")
        .optional(),
    })
    .noUnknown();
}
