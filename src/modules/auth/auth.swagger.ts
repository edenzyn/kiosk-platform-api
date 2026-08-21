const loginRequestBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
    },
  },
};

const loginResponses = {
  "200": {
    description:
      "Authenticated, or 2FA required. On success, sets the `ur_acs`/`ur_ref` auth cookies and returns the user/permissions payload. If the account has 2FA enabled, returns `{ requiresTwoFactor: true, twoFactorToken }` instead, with no cookies set — call POST /auth/2fa/verify next.",
  },
  "400": { $ref: "#/components/responses/ValidationError" },
  "401": { description: "Invalid credentials" },
};

const acceptInvitationResponses = {
  "200": {
    description:
      "Invitation accepted; account activated and auth cookies set (same shape as login).",
  },
  "400": { $ref: "#/components/responses/ValidationError" },
  "404": { description: "Invitation not found, expired, or already used" },
};

export const authSwaggerPaths: Record<string, unknown> = {
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login as a normal (org/branch) user",
      security: [],
      requestBody: loginRequestBody,
      responses: loginResponses,
    },
  },
  "/auth/2fa/verify": {
    post: {
      tags: ["Auth"],
      summary: "Complete login with a two-factor code",
      description:
        "Submits the TOTP/backup code following a login response that returned `requiresTwoFactor: true`. Works for any user type (normal, platform, reseller) — the `twoFactorToken` identifies which login flow is being completed.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["twoFactorToken", "code"],
              properties: {
                twoFactorToken: { type: "string" },
                code: { type: "string", minLength: 4, maxLength: 10 },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "2FA verified; auth cookies set and user payload returned.",
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { description: "Invalid or expired 2FA session, or incorrect code" },
      },
    },
  },
  "/auth/refresh": {
    post: {
      tags: ["Auth"],
      summary: "Rotate the refresh token and issue new user auth tokens",
      description:
        "Reads the `ur_ref` refresh-token cookie (no request body). Rejects device-client sessions.",
      security: [],
      responses: {
        "200": { description: "Token rotation succeeded and replacement cookies were set" },
        "401": { description: "Refresh token is missing, expired, revoked, already used, or belongs to a device session" },
      },
    },
  },
  "/auth/logout": {
    post: {
      tags: ["Auth"],
      summary: "Revoke the current user refresh-token session",
      responses: {
        "204": { description: "Session revoked and auth cookies cleared" },
      },
    },
  },
  "/auth/accept-invite": {
    post: {
      tags: ["Auth"],
      summary: "Accept an org/branch user invitation",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["token", "name", "password"],
              properties: {
                token: { type: "string", description: "Invitation token from the invite email/link" },
                name: { type: "string", minLength: 2, maxLength: 100 },
                password: { type: "string" },
              },
            },
          },
        },
      },
      responses: acceptInvitationResponses,
    },
  },
  "/auth/o/accept-invite": {
    post: {
      tags: ["Auth"],
      summary: "Accept an organization-owner invitation (creates the organization)",
      description:
        "Used for the top-level invite that both creates a new organization and its first admin user.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "token",
                "name",
                "password",
                "registeredName",
                "registrationNumber",
              ],
              properties: {
                token: { type: "string" },
                name: { type: "string", minLength: 2, maxLength: 100 },
                password: { type: "string" },
                registeredName: { type: "string", minLength: 2, maxLength: 255 },
                registrationNumber: { type: "string", minLength: 2, maxLength: 100 },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description:
            "Invitation accepted; organization + user created, auth cookies set. Response includes the created `organization` alongside `user`.",
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "404": { description: "Invitation not found, expired, or already used" },
      },
    },
  },
  "/auth/p/login": {
    post: {
      tags: ["Auth"],
      summary: "Platform super-admin login",
      security: [],
      requestBody: loginRequestBody,
      responses: loginResponses,
    },
  },
  "/auth/r/login": {
    post: {
      tags: ["Auth"],
      summary: "Reseller login",
      security: [],
      requestBody: loginRequestBody,
      responses: loginResponses,
    },
  },
  "/auth/r/accept-invite": {
    post: {
      tags: ["Auth"],
      summary: "Accept a reseller invitation",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["token", "name", "password"],
              properties: {
                token: { type: "string" },
                name: { type: "string", minLength: 2, maxLength: 100 },
                password: { type: "string" },
              },
            },
          },
        },
      },
      responses: acceptInvitationResponses,
    },
  },
  "/auth/d/login": {
    post: {
      tags: ["Auth"],
      summary: "Device-client login (kiosk pairing)",
      description:
        "Authenticates a kiosk device by its device code + PIN. On success sets `dvc_acs`/`dvc_ref` cookies.",
      security: [],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["deviceCode", "pin"],
              properties: {
                deviceCode: { type: "string", description: "Device pairing code" },
                pin: {
                  type: "string",
                  minLength: 4,
                  maxLength: 4,
                  pattern: "^\\d{4}$",
                  description: "4-digit numeric PIN",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description:
            "Device authenticated; sets device auth cookies. Returns `{ device, license }` (license is the currently-assigned license, if any).",
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { description: "Invalid device code or PIN" },
      },
    },
  },
  "/auth/d/refresh": {
    post: {
      tags: ["Auth"],
      summary: "Rotate the refresh token and issue new device auth tokens",
      description: "Reads the `dvc_ref` refresh-token cookie (no request body). Rejects user-client sessions.",
      security: [],
      responses: {
        "200": { description: "Token rotation succeeded; returns `{ device, token }`" },
        "401": { description: "Refresh token is missing, expired, revoked, already used, or belongs to a user session" },
      },
    },
  },
  "/auth/d/logout": {
    post: {
      tags: ["Auth"],
      summary: "Revoke the current device refresh-token session",
      security: [{ deviceCookieAuth: [] }],
      responses: {
        "204": { description: "Session revoked and device auth cookies cleared" },
      },
    },
  },
};
