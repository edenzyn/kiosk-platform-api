import { OTP_CONSTANTS } from "../../shared/constants/otp.constants";

export const resellerSwaggerPaths: Record<string, unknown> = {
  // ========================================
  // ? RESELLER SELF-SERVICE (mounted /pvt/r)
  // Reuses the same handlers/validators as the user module's self-service
  // routes (UserController / UserValidator), mounted under a reseller-only
  // prefix and gated by the RESELLER user type + RESELLER_BASIC permission.
  // ========================================
  "/pvt/r/e": {
    get: {
      tags: ["Resellers"],
      summary: "Get the current reseller's profile, permissions, and settings",
      description:
        "Resellers have no organization/branch scope and hold no roles, so the response omits availableScopes and topRole (present for other user types on the equivalent /pvt/u/e endpoint).",
      responses: {
        "200": {
          description: "Current reseller session info",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  user: { type: "object" },
                  permissions: { type: "array", items: { type: "string" } },
                  settings: { type: "object" },
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
  "/pvt/r/settings": {
    patch: {
      tags: ["Resellers"],
      summary: "Update the current reseller's account settings",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                themeMode: { type: "integer", description: "ThemeModeEnums value" },
                primaryColor: {
                  type: "string",
                  pattern: "^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$",
                  description: "Hex color, e.g. #1a2b3c",
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
          description: "Updated settings",
          content: {
            "application/json": { schema: { type: "object" } },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/r/password": {
    patch: {
      tags: ["Resellers"],
      summary: "Change the current reseller's password",
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
                  description:
                    "Must contain at least one uppercase letter, one lowercase letter, one number, and one special character; must differ from currentPassword",
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
              schema: {
                type: "object",
                properties: { message: { type: "string" } },
              },
            },
          },
        },
        "400": {
          description: "Validation error, or currentPassword is incorrect",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/r/sessions": {
    get: {
      tags: ["Resellers"],
      summary: "List the current reseller's active sessions",
      responses: {
        "200": {
          description: "List of active sessions",
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
                        lastUsedAt: { type: "string", format: "date-time", nullable: true },
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
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/r/sessions/others": {
    delete: {
      tags: ["Resellers"],
      summary: "Revoke all sessions except the current one",
      responses: {
        "200": {
          description: "Number of sessions revoked",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { revokedCount: { type: "integer" } },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/r/sessions/{sessionId}": {
    delete: {
      tags: ["Resellers"],
      summary: "Revoke a specific session",
      parameters: [
        { name: "sessionId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": {
          description: "Whether the session was revoked",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { revoked: { type: "boolean" } },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/r/2fa/status": {
    get: {
      tags: ["Resellers"],
      summary: "Get the current reseller's two-factor authentication status",
      responses: {
        "200": {
          description: "Two-factor status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  isEnabled: { type: "boolean" },
                  method: {
                    type: "integer",
                    nullable: true,
                    description: "TwoFactorMethodEnums: 1=EMAIL, 2=WHATSAPP",
                  },
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
  "/pvt/r/2fa/setup": {
    post: {
      tags: ["Resellers"],
      summary: "Begin two-factor authentication setup",
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
                  description: "TwoFactorMethodEnums: 1=EMAIL, 2=WHATSAPP",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description:
            "Setup session started; verificationId must be echoed back on /2fa/enable",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  verificationId: { type: "string", format: "uuid" },
                  method: { type: "integer" },
                },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/r/2fa/enable": {
    post: {
      tags: ["Resellers"],
      summary: "Confirm two-factor setup and enable it",
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
          description: "Two-factor enabled",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  method: { type: "integer" },
                },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/r/2fa/disable": {
    post: {
      tags: ["Resellers"],
      summary: "Disable two-factor authentication",
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
          description: "Two-factor disabled",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { message: { type: "string" } },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },

  // ========================================
  // ? PLATFORM-SIDE RESELLER MANAGEMENT (mounted /pvt/p/resellers)
  // ========================================
  "/pvt/p/resellers/invite": {
    post: {
      tags: ["Resellers"],
      summary: "Invite a new reseller",
      description:
        "Sends an invitation email; the reseller account is only created once the invite is accepted via POST /auth/r/accept-invite.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email"],
              properties: {
                name: { type: "string", minLength: 2, maxLength: 100 },
                email: { type: "string", format: "email" },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Invitation sent",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { message: { type: "string" } },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "409": { description: "A user already exists with this email, or a pending invitation already exists for it" },
      },
    },
  },
  "/pvt/p/resellers/invitations": {
    get: {
      tags: ["Resellers"],
      summary: "List reseller invitations",
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { name: "search", in: "query", schema: { type: "string" } },
        {
          name: "sortBy",
          in: "query",
          schema: { type: "string", enum: ["email", "status", "expiresAt", "createdAt"] },
        },
        {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"] },
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "integer",
            enum: [1, 2, 3, 4],
            description: "UserInvitationStatusEnum: 1=PENDING, 2=ACCEPTED, 3=EXPIRED, 4=REVOKED",
          },
        },
      ],
      responses: {
        "200": {
          description: "Paginated list of reseller invitations",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  invitations: { type: "array", items: { type: "object" } },
                  total: { type: "integer" },
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  totalPages: { type: "integer" },
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
  "/pvt/p/resellers/": {
    get: {
      tags: ["Resellers"],
      summary: "List resellers",
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { name: "search", in: "query", schema: { type: "string" } },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["active", "inactive", "all"] },
        },
        {
          name: "sortBy",
          in: "query",
          schema: { type: "string", enum: ["name", "isActive", "createdAt"] },
        },
        {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"] },
        },
      ],
      responses: {
        "200": {
          description: "Paginated list of resellers",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  resellers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        email: { type: "string", format: "email" },
                        mobile: { type: "string", nullable: true },
                        isActive: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                  total: { type: "integer" },
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  totalPages: { type: "integer" },
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
  "/pvt/p/resellers/{id}/status": {
    patch: {
      tags: ["Resellers"],
      summary: "Toggle a reseller's active status",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": {
          description: "Status toggled; returns the updated reseller",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reseller: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string" },
                      email: { type: "string", format: "email" },
                      mobile: { type: "string", nullable: true },
                      isActive: { type: "boolean" },
                      createdAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
};
