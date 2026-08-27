import cookieParser from "cookie-parser";
import express, { type Express, type Request } from "express";
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
import { deviceRouter } from "./modules/device/routes/device.routes";
import { userDeviceRouter } from "./modules/device/routes/user-device.routes";
import { financeWebhookRouter } from "./modules/finance/routes/finance-webhook.routes";
import { platformFinanceRouter } from "./modules/finance/routes/platform-finance.routes";
import { resellerFinanceRouter } from "./modules/finance/routes/reseller-finance.routes";
import { userFinanceRouter } from "./modules/finance/routes/user-finance.routes";
import { deviceLicenseRouter } from "./modules/license/routes/device-license.routes";
import { platformLicenseRouter } from "./modules/license/routes/platform-license.routes";
import { resellerLicenseRouter } from "./modules/license/routes/reseller-license.routes";
import { userLicenseRouter } from "./modules/license/routes/user-license.routes";
import notificationRoutes from "./modules/notification/notification.routes";
import { platformOrganizationRouter } from "./modules/organization/routes/platform-organization.routes";
import platformRoutes from "./modules/platform/platform.routes";
import rbacRoutes from "./modules/rbac/rbac.routes";
import { platformResellerRouter } from "./modules/reseller/routes/platform-reseller.routes";
import { resellerRouter } from "./modules/reseller/routes/reseller.routes";
import userRoutes from "./modules/user/user.routes";
import { swaggerDocument } from "./shared/utils/core/swagger";

export class App {
  private readonly apiV1Prefix = env.API_PREFIX_V1;
  private readonly normalUserApiV1Prefix = `${this.apiV1Prefix}/pvt/u`;
  private readonly platformUserApiV1Prefix = `${this.apiV1Prefix}/pvt/p`;
  private readonly resellerApiV1Prefix = `${this.apiV1Prefix}/pvt/r`;
  private readonly deviceApiV1Prefix = `${this.apiV1Prefix}/pvt/d`;
  private readonly currentEnv = env.NODE_ENV;
  readonly instance: Express;

  constructor() {
    this.instance = express();
    this.instance.set("trust proxy", 1);
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
    this.instance.use(
      express.json({
        limit: "1mb",
        verify: (req, _res, buf) => {
          (req as Request).rawBody = buf;
        },
      }),
    );
    this.instance.use(express.urlencoded({ extended: false, limit: "1mb" }));
    this.instance.use(rateLimitMiddleware);
    this.instance.use(`${this.apiV1Prefix}/pvt`, authMiddleware);
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
    this.configureHealthRoute();
    this.instance.use(`${this.apiV1Prefix}/auth`, authRoutes);
    this.instance.use(this.apiV1Prefix, notificationRoutes);
    this.instance.use(this.apiV1Prefix, financeWebhookRouter);
    this.configurePlatformUserRoutes();
    this.configureResellerRoutes();
    this.configureNormalUserRoutes();
    this.configureDeviceClientRoutes();
  }

  private configureHealthRoute(): void {
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
  }

  private configurePlatformUserRoutes(): void {
    this.instance.use(this.platformUserApiV1Prefix, platformRoutes);
    this.instance.use(
      `${this.platformUserApiV1Prefix}/resellers`,
      platformResellerRouter,
    );
    this.instance.use(
      `${this.platformUserApiV1Prefix}/organizations`,
      platformOrganizationRouter,
    );
    this.instance.use(
      `${this.platformUserApiV1Prefix}/licenses`,
      platformLicenseRouter,
    );
    this.instance.use(
      `${this.platformUserApiV1Prefix}/finance`,
      platformFinanceRouter,
    );
  }

  private configureResellerRoutes(): void {
    this.instance.use(this.resellerApiV1Prefix, resellerRouter);
    this.instance.use(
      `${this.resellerApiV1Prefix}/licenses`,
      resellerLicenseRouter,
    );
    this.instance.use(
      `${this.resellerApiV1Prefix}/finance`,
      resellerFinanceRouter,
    );
  }

  private configureNormalUserRoutes(): void {
    this.instance.use(`${this.normalUserApiV1Prefix}/users`, userRoutes);
    this.instance.use(`${this.normalUserApiV1Prefix}/rbac`, rbacRoutes);
    this.instance.use(`${this.normalUserApiV1Prefix}/branches`, branchRoutes);
    this.instance.use(
      `${this.normalUserApiV1Prefix}/devices`,
      userDeviceRouter,
    );
    this.instance.use(
      `${this.normalUserApiV1Prefix}/licenses`,
      userLicenseRouter,
    );
    this.instance.use(
      `${this.normalUserApiV1Prefix}/finance`,
      userFinanceRouter,
    );
  }

  private configureDeviceClientRoutes(): void {
    this.instance.use(`${this.deviceApiV1Prefix}/devices`, deviceRouter);
    this.instance.use(
      `${this.deviceApiV1Prefix}/licenses`,
      deviceLicenseRouter,
    );
  }

  private configureErrorHandling(): void {
    this.instance.use(notFoundHandler);
    this.instance.use(errorHandler);
  }
}
