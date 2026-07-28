import cors from "cors";
import type { Express } from "express";
import { env } from "../config/env";
import { AppError } from "../shared/errors/app-error";

export function applyCors(app: Express): void {
  const whiteList = [env.CORS_ORIGIN_1, env.CORS_ORIGIN_2].filter(
    Boolean,
  ) as string[];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || whiteList.includes(origin)) {
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
