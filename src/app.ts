import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { authMiddleware } from "./middleware/auth.middleware";
import { applyCors } from "./middleware/cors.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { notFoundHandler } from "./middleware/not-found.middleware";
import { rateLimitMiddleware } from "./middleware/rate-limit.middleware";
import { requestLogger } from "./middleware/request-logger.middleware";
import authRoutes from "./modules/auth/auth.routes";
import { branchRouter as branchRoutes } from "./modules/branch/branch.routes";
import { deviceRouter } from "./modules/device/device.routes";
import organizationRoutes from "./modules/organization/organization.routes";
import rbacRoutes from "./modules/rbac/rbac.routes";
import userRoutes from "./modules/user/user.routes";
import { swaggerDocument } from "./shared/utils/core/swagger";

export class App {
  private readonly apiV1Prefix = env.API_PREFIX_V1;
  private readonly userApiv1Prefix = `${this.apiV1Prefix}/pvt/u`;
  private readonly deviceApiv1Prefix = `${this.apiV1Prefix}/pvt/d`;
  private readonly currentEnv = env.NODE_ENV;
  readonly instance: Express;

  constructor() {
    this.instance = express();
    this.configureMiddlewares();
    this.configureSwagger();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddlewares(): void {
    if (this.currentEnv !== "production") {
      this.instance.use(requestLogger);
    }
    this.instance.use(helmet());
    applyCors(this.instance);
    this.instance.use(cookieParser());
    this.instance.use(express.json({ limit: "1mb" }));
    this.instance.use(express.urlencoded({ extended: false, limit: "1mb" }));
    this.instance.use(rateLimitMiddleware);
    this.instance.use(`${this.userApiv1Prefix}`, authMiddleware);
    this.instance.use(`${this.deviceApiv1Prefix}`, authMiddleware);
  }

  private configureSwagger(): void {
    if (this.currentEnv === "production") return;
    this.instance.get(`${this.apiV1Prefix}/api-docs.json`, (_req, res) => {
      res.json(swaggerDocument);
    });
    this.instance.use(
      `${this.apiV1Prefix}/api-docs`,
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, {
        customSiteTitle: "Kiosk Platform API Documentation",
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
        },
      }),
    );
  }

  private configureRoutes(): void {
    this.instance.get(`${this.apiV1Prefix}/health`, (_request, response) => {
      response.json({
        status: "ok",
        service: "kiosk-platform-api-v1",
        environment: env.NODE_ENV,
        uptime: `${(process.uptime() / 60).toFixed(2)} minutes`,
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      });
    });

    this.instance.use(`${this.apiV1Prefix}/auth`, authRoutes);

    // Private routes
    this.instance.use(`${this.userApiv1Prefix}/users`, userRoutes);
    this.instance.use(`${this.userApiv1Prefix}/rbac`, rbacRoutes);
    this.instance.use(
      `${this.userApiv1Prefix}/organizations`,
      organizationRoutes,
    );
    this.instance.use(`${this.userApiv1Prefix}branches`, branchRoutes);
    this.instance.use(`${this.userApiv1Prefix}/devices`, deviceRouter);

    // Private device routes
    this.instance.use(`${this.deviceApiv1Prefix}/devices`, deviceRouter);
  }

  private configureErrorHandling(): void {
    this.instance.use(notFoundHandler);
    this.instance.use(errorHandler);
  }
}
