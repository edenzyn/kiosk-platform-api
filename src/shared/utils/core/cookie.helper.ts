import type { CookieOptions, Response } from "express";
import { env } from "../../../config/env";

const defaultOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

export function setCookie(
  res: Response,
  key: string,
  value: string,
  maxAge: number,
  options?: Partial<CookieOptions>,
): void {
  res.cookie(key, value, {
    ...defaultOptions,
    maxAge,
    ...options,
  });
}

export function clearCookie(res: Response, key: string): void {
  res.clearCookie(key, { ...defaultOptions });
}
