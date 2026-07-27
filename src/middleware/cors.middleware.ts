import cors from "cors";
import type { Express } from "express";
import { env } from "../config/env";

export function applyCors(app: Express): void {
  const whiteList = [env.CORS_ORIGIN_1, env.CORS_ORIGIN_2].filter(Boolean) as string[];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || whiteList.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      credentials: true,
    }),
  );
}
