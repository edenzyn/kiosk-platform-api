import winston, { type Logger } from "winston";
import { env } from "../../config/env";

export const logger: Logger = winston.createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  defaultMeta: {
    service: "kiosk-platform-api",
    environment: env.NODE_ENV,
  },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});
