import type { CookieOptions, Response } from "express";
import { env } from "../../../config/env";

const defaultOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

export const DEVICE_COOKIE_OPTIONS: Partial<CookieOptions> = {
  sameSite: "none",
  secure: true,
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

export function clearCookie(
  res: Response,
  key: string,
  options?: Partial<CookieOptions>,
): void {
  res.clearCookie(key, { ...defaultOptions, ...options });
}
