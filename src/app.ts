import express, { type Express } from "express";
import { applyCors } from "./middleware/cors.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/not-found.middleware";
import { rateLimitMiddleware } from "./middleware/rate-limit.middleware";
import authRoutes from "./modules/auth/auth.routes";
import { swaggerDocument } from "./shared/utils/swagger";
import { env } from "./config/env";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

export class App {
  private readonly API_PREFIX_V1 = env.API_PREFIX_V1;
  readonly instance: Express;

  constructor() {
    this.instance = express();
    this.configureMiddlewares();
    this.configureSwagger();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddlewares(): void {
    this.instance.use(helmet());
    applyCors(this.instance);
    this.instance.use(express.json({ limit: "1mb" }));
    this.instance.use(express.urlencoded({ extended: false, limit: "1mb" }));
    this.instance.use(rateLimitMiddleware);
  }

  private configureSwagger(): void {
    this.instance.get(`${this.API_PREFIX_V1}/api-docs.json`, (_req, res) => {
      res.json(swaggerDocument);
    });
    this.instance.use(
      `${this.API_PREFIX_V1}/docs`,
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument),
    );
  }

  private configureRoutes(): void {
    this.instance.get(`${this.API_PREFIX_V1}/health`, (_request, response) => {
      response.json({
        status: "ok",
        service: "kiosk-platform-api-v1",
        environment: env.NODE_ENV,
        uptime: `${(process.uptime() / 60).toFixed(2)} minutes`,
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      });
    });

    this.instance.use(`${this.API_PREFIX_V1}/auth`, authRoutes);
  }

  private configureErrorHandling(): void {
    this.instance.use(notFoundHandler);
    this.instance.use(errorHandler);
  }
}
