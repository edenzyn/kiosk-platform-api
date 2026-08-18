import * as Yup from "yup";
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
}
