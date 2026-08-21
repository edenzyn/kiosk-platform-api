export const userSwaggerPaths: Record<string, unknown> = {
  "/pvt/u/users/e": {
    get: {
      tags: ["Users"],
      summary: "Get the current authenticated user's profile, permissions, and settings",
      responses: {
        "200": {
          description: "Current user, permissions, available scopes, top role, and settings",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  user: { type: "object", description: "The authenticated user (password omitted)" },
                  permissions: { type: "array", items: { type: "string" } },
                  availableScopes: {
                    type: "array",
                    description: "Present for organization/branch users; omitted for resellers",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        type: { type: "string" },
                        createdAt: { type: "string", format: "date-time", nullable: true },
                      },
                    },
                  },
                  topRole: {
                    type: "object",
                    nullable: true,
                    description: "Present for organization/branch users; omitted for resellers",
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
        "403": {
          description: "Account deactivated, or the user's organization/branch is inactive",
        },
      },
    },
  },
  "/pvt/u/users/settings": {
    patch: {
      tags: ["Users"],
      summary: "Update the current user's settings",
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
          description: "Updated user settings",
          content: { "application/json": { schema: { type: "object" } } },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/pvt/u/users/password": {
    patch: {
      tags: ["Users"],
      summary: "Change the current user's password",
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
  "/pvt/u/users/sessions": {
    get: {
      tags: ["Users"],
      summary: "List the current user's active sessions",
      responses: {
        "200": {
          description: "List of active sessions for the current user",
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
  "/pvt/u/users/sessions/others": {
    delete: {
      tags: ["Users"],
      summary: "Revoke all sessions for the current user except the current one",
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
  "/pvt/u/users/sessions/{sessionId}": {
    delete: {
      tags: ["Users"],
      summary: "Revoke a specific session for the current user",
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
  "/pvt/u/users/2fa/status": {
    get: {
      tags: ["Users"],
      summary: "Get the current user's two-factor authentication status",
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
                    enum: [1, 2, 3],
                    nullable: true,
                    description: "1 = Email, 2 = WhatsApp, 3 = Authenticator app",
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
  "/pvt/u/users/2fa/setup": {
    post: {
      tags: ["Users"],
      summary: "Begin two-factor authentication setup for the current user",
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
                  enum: [1, 2, 3],
                  description: "1 = Email, 2 = WhatsApp, 3 = Authenticator app",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description:
            "Setup started; returns an otpToken to submit alongside the verification code to POST /2fa/enable",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  otpToken: { type: "string" },
                  method: { type: "integer", enum: [1, 2, 3] },
                  qrCodeDataUrl: {
                    type: "string",
                    description: "Data URL of a QR code, present for the authenticator method",
                  },
                  manualEntryCode: {
                    type: "string",
                    description: "Manual entry key, present for the authenticator method",
                  },
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
  "/pvt/u/users/2fa/enable": {
    post: {
      tags: ["Users"],
      summary: "Confirm two-factor authentication setup and enable it for the current user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["otpToken", "code"],
              properties: {
                otpToken: { type: "string", description: "Token returned by POST /2fa/setup" },
                code: { type: "string", minLength: 4, maxLength: 10 },
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
                  backupCodes: { type: "array", items: { type: "string" } },
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
  "/pvt/u/users/2fa/disable": {
    post: {
      tags: ["Users"],
      summary: "Disable two-factor authentication for the current user",
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
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/pvt/u/users/": {
    get: {
      tags: ["Users"],
      summary: "List users within the effective organization/branch scope",
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { name: "search", in: "query", schema: { type: "string" } },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: ["name", "userType", "isActive", "createdAt"],
            default: "createdAt",
          },
        },
        {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
        },
      ],
      responses: {
        "200": {
          description: "Paginated list of users, each with its top role",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  users: { type: "array", items: { type: "object" } },
                  total: { type: "integer" },
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  totalPages: { type: "integer" },
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
  "/pvt/u/users/invite": {
    post: {
      tags: ["Users"],
      summary: "Invite a new user to the effective organization/branch",
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
                roles: {
                  type: "array",
                  items: { type: "string", format: "uuid" },
                  default: [],
                  description: "Role IDs to assign once the invitation is accepted",
                },
                branchId: {
                  type: "string",
                  format: "uuid",
                  nullable: true,
                  description: "Defaults to the caller's effective branch when omitted",
                },
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
              schema: { type: "object", properties: { message: { type: "string" } } },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "409": {
          description:
            "A user already exists with this email address, or a pending invitation already exists for it",
        },
      },
    },
  },
  "/pvt/u/users/invitations": {
    get: {
      tags: ["Users"],
      summary: "List pending/past user invitations for the effective organization/branch",
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { name: "search", in: "query", schema: { type: "string" } },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: ["email", "status", "expiresAt", "createdAt"],
            default: "createdAt",
          },
        },
        {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "integer",
            enum: [1, 2, 3, 4],
            description: "1 = Pending, 2 = Accepted, 3 = Expired, 4 = Revoked",
          },
        },
        { name: "expiresStart", in: "query", schema: { type: "string", format: "date-time" } },
        {
          name: "expiresEnd",
          in: "query",
          schema: { type: "string", format: "date-time" },
          description: "Must not be before expiresStart",
        },
      ],
      responses: {
        "200": {
          description: "Paginated list of invitations",
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
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/u/users/invitations/{id}/revoke": {
    post: {
      tags: ["Users"],
      summary: "Revoke a pending user invitation",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": {
          description: "Invitation revoked",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { message: { type: "string" }, success: { type: "boolean" } },
              },
            },
          },
        },
        "400": {
          description: "Only pending invitations can be revoked",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "The invitation does not belong to the caller's organization",
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/users/invitations/{id}/resend": {
    post: {
      tags: ["Users"],
      summary: "Resend an expired user invitation with a fresh token and expiry",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": {
          description: "Invitation resent",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { message: { type: "string" }, success: { type: "boolean" } },
              },
            },
          },
        },
        "400": {
          description: "Only expired invitations can be resent",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "The invitation does not belong to the caller's organization",
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
};
