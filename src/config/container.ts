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
import { ResellerContainer } from "../modules/reseller/reseller.container";
import { UserContainer } from "../modules/user/user.container";
import { MailService } from "../shared/services/mail/mail.service";
import { QrCodeService } from "../shared/services/qrcode/qrcode.service";
import { TotpService } from "../shared/services/totp/totp.service";
import { WhatsAppService } from "../shared/services/whatsapp/whatsapp.service";
import { initDatabase } from "./db";
import { mailTransporter } from "./mail";

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
  strict: true,
});

container.register({
  database: asFunction(initDatabase).singleton(),
  mailTransporter: asValue(mailTransporter),
  mailService: asClass(MailService).singleton(),
  whatsAppService: asClass(WhatsAppService).singleton(),
  qrCodeService: asClass(QrCodeService).singleton(),
  totpService: asClass(TotpService).singleton(),
});

UserContainer.register(container);
AuthContainer.register(container);
OrganizationContainer.register(container);
BranchContainer.register(container);
RbacContainer.register(container);
DeviceContainer.register(container);
LicenseContainer.register(container);
PlatformContainer.register(container);
ResellerContainer.register(container);
