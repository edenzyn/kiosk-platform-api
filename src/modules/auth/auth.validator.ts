import { z } from "zod";

export class AuthValidator {
  static readonly login = z
    .object({
      identifier: z
        .string()
        .trim()
        .superRefine((val, ctx) => {
          if (val.includes("@")) {
            if (!z.string().email().safeParse(val).success) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid email address",
              });
            }
          } else {
            if (!/^\d{10,20}$/.test(val)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Mobile number must contain 10-20 digits only",
              });
            }
          }
        }),
      password: z.string().min(8).max(72),
    })
    .strict();

  static readonly register = z
    .object({
      name: z.string().trim().min(2).max(100),
      email: z
        .string()
        .email()
        .transform((email) => email.toLowerCase()),
      mobile: z
        .string()
        .trim()
        .regex(/^\d+$/, "Mobile number must contain only digits")
        .min(10)
        .max(20),
      password: z.string().min(8).max(72),
    })
    .strict();
}

export type LoginUserRequestDto = z.infer<typeof AuthValidator.login>;
export type RegisterUserRequestDto = z.infer<typeof AuthValidator.register>;
