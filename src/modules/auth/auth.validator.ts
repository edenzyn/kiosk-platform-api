import * as Yup from "yup";
import { OTP_CONSTANTS } from "../../shared/constants/otp.constants";
import { deviceCodeValidator } from "../../shared/validators/device-code.validator";
import { emailValidator } from "../../shared/validators/email.validator";
import { passwordValidator } from "../../shared/validators/password.validator";

export class AuthValidator {
  static readonly login = Yup.object({
    email: emailValidator("Invalid email address").required(
      "Email is required",
    ),
    password: passwordValidator().required("Password is required"),
  }).noUnknown();

  static readonly acceptInvitation = Yup.object({
    token: Yup.string().required("Invitation key is required"),
    name: Yup.string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .required("Name is required"),
    password: passwordValidator().required("Password is required"),
  }).noUnknown();

  static readonly acceptResellerInvitation = Yup.object({
    token: Yup.string().required("Invitation key is required"),
    name: Yup.string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .required("Name is required"),
    password: passwordValidator().required("Password is required"),
  }).noUnknown();

  static readonly acceptOrganizationInvitation = Yup.object({
    token: Yup.string().required("Invitation key is required"),
    name: Yup.string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .required("Name is required"),
    password: passwordValidator().required("Password is required"),
    registeredName: Yup.string()
      .trim()
      .min(2, "Registered name must be at least 2 characters")
      .max(255, "Registered name cannot exceed 255 characters")
      .required("Registered name is required"),
    registrationNumber: Yup.string()
      .trim()
      .min(2, "Registration number must be at least 2 characters")
      .max(100, "Registration number cannot exceed 100 characters")
      .required("Registration number is required"),
  }).noUnknown();

  static readonly loginDevice = Yup.object({
    deviceCode: deviceCodeValidator(
      "Device code is required",
      "Invalid device code format",
    ),
    pin: Yup.string()
      .required("PIN is required")
      .length(4, "PIN must be exactly 4 digits")
      .matches(/^\d{4}$/, "PIN must contain only numbers"),
  }).noUnknown();

  static readonly verifyTwoFactor = Yup.object({
    verificationId: Yup.string()
      .uuid("Invalid verification session")
      .required("Verification session is required"),
    code: Yup.string()
      .trim()
      .length(OTP_CONSTANTS.CODE_LENGTH, "Enter a valid code")
      .required("Code is required"),
  }).noUnknown();
}
