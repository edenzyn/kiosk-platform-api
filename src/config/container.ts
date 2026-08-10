import { asClass, asFunction, asValue, createContainer, InjectionMode } from "awilix";
import { initDatabase } from "./db";
import { mailTransporter } from "./mail";
import { MailService } from "../shared/services/mail/mail.service";
import { AuthContainer } from "../modules/auth/auth.container";
import { UserContainer } from "../modules/user/user.container";
import { OrganizationContainer } from "../modules/organization/organization.container";
import { BranchContainer } from "../modules/branch/branch.container";
import { RbacContainer } from "../modules/rbac/rbac.container";
import { DeviceContainer } from "../modules/device/device.container";

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
  strict: true,
});

container.register({
  database: asFunction(initDatabase).singleton(),
  mailTransporter: asValue(mailTransporter),
  mailService: asClass(MailService).singleton(),
});

UserContainer.register(container);
AuthContainer.register(container);
OrganizationContainer.register(container);
BranchContainer.register(container);
RbacContainer.register(container);
DeviceContainer.register(container);
