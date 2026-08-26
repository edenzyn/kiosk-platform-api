import { authSwaggerPaths } from "../../../modules/auth/auth.swagger";
import { branchSwaggerPaths } from "../../../modules/branch/branch.swagger";
import { deviceSwaggerPaths } from "../../../modules/device/device.swagger";
import { financeSwaggerPaths } from "../../../modules/finance/finance.swagger";
import { licenseSwaggerPaths } from "../../../modules/license/license.swagger";
import { notificationSwaggerPaths } from "../../../modules/notification/notification.swagger";
import { organizationSwaggerPaths } from "../../../modules/organization/organization.swagger";
import { platformSwaggerPaths } from "../../../modules/platform/platform.swagger";
import { rbacSwaggerPaths } from "../../../modules/rbac/rbac.swagger";
import { resellerSwaggerPaths } from "../../../modules/reseller/reseller.swagger";
import { userSwaggerPaths } from "../../../modules/user/user.swagger";

export const swaggerDocument = {
  openapi: "3.1.0",
  info: {
    title: "Kiosk Platform API",
    version: "1.0.0",
    description:
      "Modular Kiosk Platform API providing authentication, tenant management, licensing, and kiosk operations.",
  },
  servers: [
    {
      url: "/api/v1",
    },
  ],
  tags: [
    { name: "Auth", description: "Login, session, and invitation-acceptance flows for every user type" },
    { name: "Users", description: "Self-service account settings, sessions, 2FA, and org/branch user management" },
    { name: "Organizations", description: "Platform-side organization onboarding and management" },
    { name: "Branches", description: "Branch management within an organization" },
    { name: "Devices", description: "Kiosk device registration, management, and device-client self-check" },
    { name: "Licenses", description: "License purchasing, assignment, extension, and history (org/branch side)" },
    { name: "Reseller Licenses", description: "Reseller license inventory, pricing, and purchasing" },
    { name: "Redemption Codes", description: "Reseller-generated redemption codes bundling licenses for resale" },
    { name: "Platform Licenses", description: "Platform-managed pricing plans and discount rules" },
    { name: "Device Licenses", description: "Device-client license activation" },
    { name: "RBAC", description: "Role and permission management within an organization or branch" },
    { name: "Resellers", description: "Reseller account self-service and platform-side reseller management" },
    { name: "Platform", description: "Platform super-admin self-service account" },
    { name: "Notifications", description: "Outbound email/WhatsApp sending and inbound WhatsApp webhook" },
    { name: "Finance", description: "Display-only currency exchange rates for the frontend to convert prices with" },
  ],
  // Cookie-based auth is the primary mechanism (see auth.middleware.ts); a
  // Bearer header is accepted as a fallback. Individual operations override
  // this with `security: []` (public) or `security: [{ deviceCookieAuth: [] }, ...]`
  // (device-client routes) as needed.
  security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "ur_acs",
        description:
          "User/reseller/platform access token, set as an httpOnly cookie on login.",
      },
      deviceCookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "dvc_acs",
        description: "Device-client access token, set as an httpOnly cookie on device login.",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Fallback for clients that can't send cookies (e.g. Swagger \"Try it out\").",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", description: "Machine-readable error code" },
              message: { type: "string" },
              details: {
                type: "object",
                description: "Field-level validation errors, present on 400 responses",
                additionalProperties: { type: "string" },
              },
            },
            required: ["message"],
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing, invalid, or expired session",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      Forbidden: {
        description: "Authenticated but missing the required permission",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      NotFound: {
        description: "Resource not found",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
      ValidationError: {
        description: "Request failed schema validation",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
      },
    },
    parameters: {
      PageParam: {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
      },
      LimitParam: {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
      },
    },
  },
  paths: {
    ...authSwaggerPaths,
    ...organizationSwaggerPaths,
    ...userSwaggerPaths,
    ...branchSwaggerPaths,
    ...deviceSwaggerPaths,
    ...licenseSwaggerPaths,
    ...rbacSwaggerPaths,
    ...resellerSwaggerPaths,
    ...platformSwaggerPaths,
    ...notificationSwaggerPaths,
    ...financeSwaggerPaths,
  },
};
