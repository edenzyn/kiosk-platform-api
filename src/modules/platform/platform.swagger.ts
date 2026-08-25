import { OTP_CONSTANTS } from "../../shared/constants/otp.constants";

export const platformSwaggerPaths: Record<string, unknown> = {
  "/pvt/p/e": {
    get: {
      tags: ["Platform"],
      summary: "Get the current authenticated platform user's profile, permissions, and settings",
      responses: {
        "200": {
          description: "Current platform user, permissions, top role, and settings",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  user: { type: "object", description: "The authenticated user (password omitted)" },
                  permissions: { type: "array", items: { type: "string" } },
                  topRole: {
                    type: "object",
                    nullable: true,
                    properties: {
                      name: { type: "string" },
                      description: { type: "string", nullable: true },
                      rank: { type: "integer" },
                      isSystem: { type: "boolean" },
                    },
                  },
                  settings: { type: "object", description: "The user's settings (theme, locale, 2FA, etc.)" },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/p/settings": {
    patch: {
      tags: ["Platform"],
      summary: "Update the current platform user's settings",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                themeMode: { type: "string", enum: ["light", "dark", "system"] },
                primaryColor: {
                  type: "string",
                  pattern: "^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$",
                  description: "Hex color, e.g. #10b981 or #fff",
                },
                languageCode: { type: "string", minLength: 2, maxLength: 10 },
                timezone: { type: "string", minLength: 1, maxLength: 100 },
                currencyCode: { type: "string", minLength: 3, maxLength: 3 },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated platform user settings",
          content: { "application/json": { schema: { type: "object" } } },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/pvt/p/password": {
    patch: {
      tags: ["Platform"],
      summary: "Change the current platform user's password",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["currentPassword", "newPassword"],
              properties: {
                currentPassword: { type: "string" },
                newPassword: {
                  type: "string",
                  minLength: 8,
                  maxLength: 64,
                  description:
                    "Must differ from the current password and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@!#$%^&*()-_=+.,?)",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Password changed",
          content: {
            "application/json": {
              schema: { type: "object", properties: { message: { type: "string" } } },
            },
          },
        },
        "400": {
          description: "Validation error, or the current password is incorrect",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/pvt/p/sessions": {
    get: {
      tags: ["Platform"],
      summary: "List the current platform user's active sessions",
      responses: {
        "200": {
          description: "List of active sessions for the current platform user",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  sessions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        deviceName: { type: "string", nullable: true },
                        ipAddress: { type: "string", nullable: true },
                        lastUsedAt: { type: "string", format: "date-time" },
                        createdAt: { type: "string", format: "date-time" },
                        isCurrent: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/pvt/p/sessions/others": {
    delete: {
      tags: ["Platform"],
      summary: "Revoke all sessions for the current platform user except the current one",
      responses: {
        "200": {
          description: "Number of sessions revoked",
          content: {
            "application/json": {
              schema: { type: "object", properties: { revokedCount: { type: "integer" } } },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/pvt/p/sessions/{sessionId}": {
    delete: {
      tags: ["Platform"],
      summary: "Revoke a specific session for the current platform user",
      parameters: [
        { name: "sessionId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": {
          description: "Whether the session was revoked",
          content: {
            "application/json": {
              schema: { type: "object", properties: { revoked: { type: "boolean" } } },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/pvt/p/2fa/status": {
    get: {
      tags: ["Platform"],
      summary: "Get the current platform user's two-factor authentication status",
      responses: {
        "200": {
          description: "Whether 2FA is enabled, and the method in use",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  isEnabled: { type: "boolean" },
                  method: {
                    type: "integer",
                    enum: [1, 2],
                    nullable: true,
                    description: "1 = Email, 2 = WhatsApp",
                  },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/pvt/p/2fa/setup": {
    post: {
      tags: ["Platform"],
      summary: "Begin two-factor authentication setup for the current platform user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["method"],
              properties: {
                method: {
                  type: "integer",
                  enum: [1, 2],
                  description: "1 = Email, 2 = WhatsApp",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description:
            "Setup started; returns a verificationId to submit alongside the verification code to POST /2fa/enable",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  verificationId: { type: "string", format: "uuid" },
                  method: { type: "integer", enum: [1, 2, 3] },
                },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/pvt/p/2fa/enable": {
    post: {
      tags: ["Platform"],
      summary: "Confirm two-factor authentication setup and enable it for the current platform user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["verificationId", "code"],
              properties: {
                verificationId: { type: "string", format: "uuid" },
                code: {
                  type: "string",
                  minLength: OTP_CONSTANTS.CODE_LENGTH,
                  maxLength: OTP_CONSTANTS.CODE_LENGTH,
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "2FA enabled; returns one-time backup codes",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  method: { type: "integer", enum: [1, 2, 3] },
                },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/pvt/p/2fa/disable": {
    post: {
      tags: ["Platform"],
      summary: "Disable two-factor authentication for the current platform user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["password"],
              properties: { password: { type: "string" } },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "2FA disabled",
          content: {
            "application/json": {
              schema: { type: "object", properties: { message: { type: "string" } } },
            },
          },
        },
        "400": {
          description: "Validation error, or the password is incorrect",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
};
