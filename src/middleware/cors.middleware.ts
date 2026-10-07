import cors from "cors";
import type { Express } from "express";
import { isAllowedOrigin } from "../config/cors";
import { ForbiddenError } from "../shared/errors/forbidden-error";

export function applyCors(app: Express): void {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new ForbiddenError("Not allowed by CORS"));
        }
      },
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      credentials: true,
    }),
  );
}
