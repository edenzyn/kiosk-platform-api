import * as Yup from "yup";
import { passwordValidator } from "../../shared/validators/password.validator";
import { emailValidator } from "../../shared/validators/email.validator";
import { VALIDATION_CONSTANTS } from "../../shared/constants/validation.constants";

export class AuthValidator {
  static readonly login = Yup.object({
    email: emailValidator("Invalid email address").required("Email is required"),
    password: passwordValidator().required("Password is required"),
  }).noUnknown();

  static readonly register = Yup.object({
    name: Yup.string()
      .trim()
      .min(
        VALIDATION_CONSTANTS.USERS_NAME_MIN_LENGTH,
        `Name must be at least ${VALIDATION_CONSTANTS.USERS_NAME_MIN_LENGTH} characters`,
      )
      .max(
        VALIDATION_CONSTANTS.USERS_NAME_MAX_LENGTH,
        `Name cannot exceed ${VALIDATION_CONSTANTS.USERS_NAME_MAX_LENGTH} characters`,
      )
      .required("Name is required"),
    email: emailValidator("Please enter a valid email address").required("Email is required"),
    password: passwordValidator().required("Password is required"),
  }).noUnknown();
}
