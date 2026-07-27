import { z } from "zod";

export class AuthValidator {
  static readonly login = z.object({
    email: z.email().transform((email) => email.toLowerCase()),
    password: z.string().min(8).max(72),
  });

  static readonly register = AuthValidator.login.extend({
    name: z.string().trim().min(2).max(100),
  });
}
