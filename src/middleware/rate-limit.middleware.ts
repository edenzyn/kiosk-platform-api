import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
