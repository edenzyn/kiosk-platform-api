import { authSwaggerPaths } from "../../modules/auth/auth.swagger";

export const swaggerDocument = {
  openapi: "3.1.0",
  info: {
    title: "Kiosk Platform API",
    version: "1.0.0",
  },
  paths: {
    ...authSwaggerPaths,
  },
};
