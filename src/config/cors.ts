import { env } from "./env";

const whiteList = [
  env.CORS_ORIGIN_1,
  env.CORS_ORIGIN_2,
  env.CORS_ORIGIN_3,
].filter(Boolean) as string[];

/**
 * Whether a request origin may call the API. Requests without an origin
 * (server-to-server, native clients) are allowed, as browsers always send one.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  const isSelfOrigin =
    env.NODE_ENV !== "production" && origin?.endsWith(`:${env.PORT}`);

  return !origin || Boolean(isSelfOrigin) || whiteList.includes(origin);
}
