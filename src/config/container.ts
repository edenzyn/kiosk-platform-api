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
import { LicenseContainer } from "../modules/license/license.container";
import { OrganizationContainer } from "../modules/organization/organization.container";
import { PlatformContainer } from "../modules/platform/platform.container";
import { RbacContainer } from "../modules/rbac/rbac.container";
import { UserContainer } from "../modules/user/user.container";
import { MailService } from "../shared/services/mail/mail.service";
import { Msg91OtpService } from "../shared/services/otp/msg91/msg91-otp.service";
import { initDatabase } from "./db";
import { mailTransporter } from "./mail";
import { msg91Config } from "./msg91";

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
  strict: true,
});

container.register({
  database: asFunction(initDatabase).singleton(),
  mailTransporter: asValue(mailTransporter),
  mailService: asClass(MailService).singleton(),
  msg91Config: asValue(msg91Config),
  msg91OtpService: asClass(Msg91OtpService).singleton(),
});

UserContainer.register(container);
AuthContainer.register(container);
OrganizationContainer.register(container);
BranchContainer.register(container);
RbacContainer.register(container);
DeviceContainer.register(container);
LicenseContainer.register(container);
PlatformContainer.register(container);
