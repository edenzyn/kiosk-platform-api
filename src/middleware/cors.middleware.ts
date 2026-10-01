import cors from "cors";
import type { Express } from "express";
import { isAllowedOrigin } from "../config/cors";
import { AppError } from "../shared/errors/app-error";

export function applyCors(app: Express): void {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new AppError("Not allowed by CORS", { statusCode: 403 }));
        }
      },
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      credentials: true,
    }),
  );
}
