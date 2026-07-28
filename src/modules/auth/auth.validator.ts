import { z } from "zod";
import validateAndParseMobile from "../../shared/validators/phone.validator";
import validatePassword from "../../shared/validators/password.validator";
import { VALIDATION_CONSTANTS } from "../../shared/constants/validation.constants";

export class AuthValidator {
  static readonly login = z
    .object({
      identifier: z
        .string({ message: "Email or Mobile is required" })
        .trim()
        .min(1, "Email or Mobile is required")
        .superRefine((val, ctx) => {
          if (val.includes("@")) {
            if (!z.string().email().safeParse(val).success) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid email address",
              });
            }
          } else {
            if (!validateAndParseMobile(val)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please enter a valid mobile number",
              });
            }
          }
        }),
      password: z
        .string({ message: "Password is required" })
        .min(
          VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH,
          `Password must be at least ${VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH} characters`,
        )
        .max(
          VALIDATION_CONSTANTS.PASSWORD_MAX_LENGTH,
          `Password cannot exceed ${VALIDATION_CONSTANTS.PASSWORD_MAX_LENGTH} characters`,
        )
        .refine(
          validatePassword,
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        ),
    })
    .strict();

  static readonly register = z
    .object({
      name: z
        .string({ message: "Name is required" })
        .trim()
        .min(
          VALIDATION_CONSTANTS.USERS_NAME_MIN_LENGTH,
          `Name must be at least ${VALIDATION_CONSTANTS.USERS_NAME_MIN_LENGTH} characters`,
        )
        .max(
          VALIDATION_CONSTANTS.USERS_NAME_MAX_LENGTH,
          `Name cannot exceed ${VALIDATION_CONSTANTS.USERS_NAME_MAX_LENGTH} characters`,
        ),
      email: z
        .string({ message: "Email is required" })
        .email("Please enter a valid email address")
        .transform((email) => email.toLowerCase()),
      mobile: z
        .string({ message: "Mobile number is required" })
        .trim()
        .refine(validateAndParseMobile, "Please enter a valid mobile number"),
      password: z
        .string({ message: "Password is required" })
        .min(
          VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH,
          `Password must be at least ${VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH} characters`,
        )
        .max(
          VALIDATION_CONSTANTS.PASSWORD_MAX_LENGTH,
          `Password cannot exceed ${VALIDATION_CONSTANTS.PASSWORD_MAX_LENGTH} characters`,
        )
        .refine(
          validatePassword,
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        ),
    })
    .strict();
}

export type LoginUserRequestDto = z.infer<typeof AuthValidator.login>;
export type RegisterUserRequestDto = z.infer<typeof AuthValidator.register>;
