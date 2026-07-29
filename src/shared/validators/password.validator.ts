import * as Yup from "yup";
import { VALIDATION_CONSTANTS } from "../constants/validation.constants";

export const validatePassword = (password: string | undefined): boolean => {
  if (!password) return false;
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@!#$%^&*()\-_=+.,?])[A-Za-z\d@!#$%^&*()\-_=+.,?]+$/;
  return regex.test(password);
};

export const passwordValidator = (_message = "Password is required") =>
  Yup.string()
    .min(
      VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH,
      `Password must be at least ${VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH} characters`,
    )
    .max(
      VALIDATION_CONSTANTS.PASSWORD_MAX_LENGTH,
      `Password cannot exceed ${VALIDATION_CONSTANTS.PASSWORD_MAX_LENGTH} characters`,
    )
    .test(
      "is-strong-password",
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      validatePassword,
    );
