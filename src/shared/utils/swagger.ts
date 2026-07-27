import { authSwaggerPaths } from "../../modules/auth/auth.swagger";
import { organizationSwaggerPaths } from "../../modules/organization/organization.swagger";

export const swaggerDocument = {
  openapi: "3.1.0",
  info: {
    title: "Kiosk Platform API",
    version: "1.0.0",
    description:
      "Modular Kiosk Platform API providing authentication, tenant management, and kiosk operations.",
  },
  servers: [
    {
      url: "/api/v1",
    },
  ],
  paths: {
    ...authSwaggerPaths,
    ...organizationSwaggerPaths,
  },
};
