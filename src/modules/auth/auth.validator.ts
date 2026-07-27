import { z } from "zod";

export class AuthValidator {
  static readonly login = z
    .object({
      identifier: z.string().trim().min(5).max(255),
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
      mobile: z.string().trim().min(10).max(20),
      password: z.string().min(8).max(72),
    })
    .strict();
}

export type LoginUserRequestDto = z.infer<typeof AuthValidator.login>;
export type RegisterUserRequestDto = z.infer<typeof AuthValidator.register>;
