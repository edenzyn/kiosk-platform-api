import * as yup from "yup";
import { DeviceAdminAuthMethodEnum } from "../../shared/enums/device/device-admin-auth-method.enum";
import { numericEnumValidator } from "../../shared/validators/numeric-enum.validator";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";

const shiftVerificationSchema = yup
  .object({
    managerId: yup
      .string()
      .uuid("Invalid shift manager id")
      .required("Shift manager is required"),
    method: numericEnumValidator(
      DeviceAdminAuthMethodEnum,
      "Verification method",
    ).optional(),
    secret: yup.string().max(255, "Password or PIN is too long").optional(),
    verificationId: yup.string().uuid("Invalid verification id").optional(),
    code: yup
      .string()
      .trim()
      .max(20, "Verification code is too long")
      .optional(),
  })
  .noUnknown()
  .default(undefined)
  .optional();

export class ShiftValidator {
  static getShiftManagersQuery = paginationQuerySchema
    .shape({
      search: yup.string().trim().max(100).optional(),
    })
    .noUnknown();

  static sendShiftVerificationCode = yup
    .object({
      managerId: yup
        .string()
        .uuid("Invalid shift manager id")
        .required("Shift manager is required"),
    })
    .noUnknown();

  static startShift = yup
    .object({
      openingCash: yup
        .number()
        .typeError("Opening cash must be a number")
        .min(0, "Opening cash cannot be negative")
        .max(99999999.99, "Opening cash is too large")
        .required("Opening cash is required"),
      verification: shiftVerificationSchema,
    })
    .noUnknown();

  static getBusinessDayShiftsQuery = yup
    .object({
      businessDayId: yup
        .string()
        .uuid("Invalid business day id")
        .required("Business day is required"),
    })
    .noUnknown();

  static shiftIdParams = yup
    .object({
      id: yup
        .string()
        .uuid("Invalid shift id")
        .required("Shift id is required"),
    })
    .noUnknown();

  static forceCloseShift = yup
    .object({
      reason: yup
        .string()
        .trim()
        .max(500, "Reason cannot exceed 500 characters")
        .required("Reason is required"),
    })
    .noUnknown();

  static endShift = yup
    .object({
      note: yup
        .string()
        .trim()
        .max(500, "Note cannot exceed 500 characters")
        .nullable()
        .optional(),
      verification: shiftVerificationSchema,
    })
    .noUnknown();
}
