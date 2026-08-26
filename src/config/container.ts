import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
} from "awilix";
import { AuthContainer } from "../modules/auth/auth.container";
import { BranchContainer } from "../modules/branch/branch.container";
import { DeviceContainer } from "../modules/device/device.container";
import { FinanceContainer } from "../modules/finance/finance.container";
import { LicenseContainer } from "../modules/license/license.container";
import { NotificationContainer } from "../modules/notification/notification.container";
import { OrganizationContainer } from "../modules/organization/organization.container";
import { PlatformContainer } from "../modules/platform/platform.container";
import { RbacContainer } from "../modules/rbac/rbac.container";
import { ResellerContainer } from "../modules/reseller/reseller.container";
import { UserContainer } from "../modules/user/user.container";
import { FrankfurterProvider } from "../shared/providers/finance/frankfurter.provider";
import { RedisProvider } from "../shared/providers/redis/redis.provider";
import { createEmailQueue } from "../shared/queue/email/email.queue";
import { initDatabase } from "./db";
import { mailTransporter } from "./mail";
import { createQueueConnection } from "./queue-connection";
import { initRedis } from "./redis";

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
  strict: true,
});

container.register({
  database: asFunction(initDatabase).singleton(),
  redis: asFunction(initRedis).singleton(),
  redisProvider: asClass(RedisProvider).singleton(),
  frankfurterProvider: asClass(FrankfurterProvider).singleton(),
  queueConnection: asFunction(createQueueConnection).singleton(),
  emailQueue: asFunction(createEmailQueue).singleton(),
  mailTransporter: asValue(mailTransporter),
});

UserContainer.register(container);
AuthContainer.register(container);
OrganizationContainer.register(container);
BranchContainer.register(container);
RbacContainer.register(container);
DeviceContainer.register(container);
FinanceContainer.register(container);
LicenseContainer.register(container);
PlatformContainer.register(container);
ResellerContainer.register(container);
NotificationContainer.register(container);
