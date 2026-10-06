const deviceSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    organizationId: { type: "string", format: "uuid" },
    branchId: { type: "string", format: "uuid" },
    deviceCode: {
      type: "string",
      nullable: true,
      description: "System-generated unique device code, e.g. KSK-AB12-CD34",
    },
    name: { type: "string" },
    deviceType: {
      type: "integer",
      enum: [1, 2, 3, 4],
      description: "1=KIOSK, 2=COUNTER, 3=KDS, 4=CDS",
    },
    isActive: { type: "boolean", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    createdBy: { type: "string", format: "uuid", nullable: true },
    updatedBy: { type: "string", format: "uuid", nullable: true },
  },
  description: "Device record with the pin field omitted.",
};

const deviceWithBranchSchema = {
  allOf: [
    deviceSchema,
    {
      type: "object",
      properties: {
        branchName: { type: "string", nullable: true },
        isOnline: {
          type: "boolean",
          description: "Whether the device has a live socket connection",
        },
        license: {
          type: "object",
          nullable: true,
          description:
            "The device's current license (the one expiring last); null when none is assigned",
          properties: {
            id: { type: "string", format: "uuid" },
            status: {
              type: "integer",
              enum: [1, 2, 3, 4, 5],
              description:
                "1=AVAILABLE, 2=ACTIVE, 3=GRACE_PERIOD, 4=EXPIRED, 5=REVOKED",
            },
            planName: { type: "string" },
            activatedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            expiresAt: { type: "string", format: "date-time", nullable: true },
          },
        },
      },
    },
  ],
};

const licenseSchema = {
  type: "object",
  nullable: true,
  description:
    "The device's active license if one exists, otherwise its most recent license, otherwise null.",
  properties: {
    id: { type: "string", format: "uuid" },
    organizationId: { type: "string", format: "uuid", nullable: true },
    branchId: { type: "string", format: "uuid", nullable: true },
    deviceId: { type: "string", format: "uuid", nullable: true },
    status: {
      type: "integer",
      enum: [1, 2, 3, 4, 5],
      description:
        "1=AVAILABLE, 2=ACTIVE, 3=GRACE_PERIOD, 4=EXPIRED, 5=REVOKED",
    },
    activatedAt: { type: "string", format: "date-time", nullable: true },
    expiresAt: { type: "string", format: "date-time", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const deviceStaffSessionSchema = {
  type: "object",
  properties: {
    staffToken: { type: "string" },
    expiresInSeconds: { type: "integer", example: 900 },
    sessionExpiresAt: { type: "string", format: "date-time" },
    staff: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
      },
    },
  },
};

export const deviceSwaggerPaths: Record<string, unknown> = {
  "/pvt/u/devices/": {
    get: {
      tags: ["Devices"],
      summary: "List devices",
      description:
        "Returns a paginated list of devices for the effective organization/branch. Each device includes its branch name but not license/status details — use the device-client auth-check or the Devices module for that.",
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { name: "search", in: "query", schema: { type: "string" } },
        {
          name: "type",
          in: "query",
          description:
            "Filter by device type (1=KIOSK, 2=COUNTER, 3=KDS, 4=CDS)",
          schema: { type: "integer", enum: [1, 2, 3, 4] },
        },
        {
          name: "branchId",
          in: "query",
          description:
            "Ignored when the caller's effective tenant already scopes to a branch",
          schema: { type: "string", format: "uuid" },
        },
        { name: "isActive", in: "query", schema: { type: "boolean" } },
        { name: "sortBy", in: "query", schema: { type: "string" } },
        {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"] },
        },
      ],
      responses: {
        "200": {
          description: "Paginated list of devices",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  devices: { type: "array", items: deviceWithBranchSchema },
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
    post: {
      tags: ["Devices"],
      summary: "Create a device",
      description:
        "Registers a new device under the given branch. A unique deviceCode is generated server-side from the device type and a random suffix; the PIN is hashed before storage.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["branchId", "name", "pin", "deviceType"],
              properties: {
                branchId: { type: "string", format: "uuid" },
                name: { type: "string", maxLength: 255 },
                pin: {
                  type: "integer",
                  description: "4-digit numeric PIN (1000-9999)",
                  minimum: 1000,
                  maximum: 9999,
                },
                deviceType: {
                  type: "integer",
                  enum: [1, 2, 3, 4],
                  description: "1=KIOSK, 2=COUNTER, 3=KDS, 4=CDS",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Device created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { device: deviceSchema },
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
  "/pvt/u/devices/{id}": {
    get: {
      tags: ["Devices"],
      summary:
        "Get a device with its license, online status and active session",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Device details",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  device: deviceWithBranchSchema,
                  session: {
                    type: "object",
                    nullable: true,
                    description:
                      "The device's active sign-in (the most recently used one); null when signed out",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      deviceName: {
                        type: "string",
                        nullable: true,
                        example: "Chrome (Android)",
                      },
                      ipAddress: { type: "string", nullable: true },
                      createdAt: { type: "string", format: "date-time" },
                      lastUsedAt: { type: "string", format: "date-time" },
                      expiresAt: { type: "string", format: "date-time" },
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
    put: {
      tags: ["Devices"],
      summary: "Update a device",
      description:
        "Partially updates a device's branch, name, device code or PIN. The device type is fixed once the device is created. Omitted fields are left unchanged; a field explicitly set to null clears it where nullable.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                branchId: { type: "string", format: "uuid" },
                deviceCode: { type: "string", maxLength: 255, nullable: true },
                name: { type: "string", maxLength: 255, nullable: true },
                pin: {
                  type: "integer",
                  nullable: true,
                  description: "4-digit numeric PIN (1000-9999)",
                  minimum: 1000,
                  maximum: 9999,
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Device updated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { device: deviceSchema },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/devices/{id}/session": {
    delete: {
      tags: ["Devices"],
      summary: "Revoke a device's session",
      description:
        "Signs the device out everywhere: every active session of the device is revoked, its tokens stop working and its socket is disconnected, so it can sign in again.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": { description: "Device session revoked" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/devices/{id}/staff-session": {
    delete: {
      tags: ["Devices"],
      summary: "Revoke the staff session on a device",
      description:
        "Signs the staff member out of a counter or KDS device without signing the device itself out. The device gets a `device.staff-session.revoked` socket event and returns to the staff sign-in. 404 when nobody is signed in.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": { description: "Staff session revoked" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/devices/{id}/terminal": {
    patch: {
      tags: ["Devices"],
      summary: "Map a card terminal to a device",
      description:
        "Sets the card terminal (Pine Labs) the device is paired with. Send an empty terminalId to unmap it. Only kiosk and counter devices take card payments.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                terminalId: { type: "string", maxLength: 100, nullable: true },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Device with its mapped terminal" },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/devices/{id}/status": {
    patch: {
      tags: ["Devices"],
      summary: "Toggle a device's active status",
      description:
        "Flips the device's isActive flag (active becomes inactive and vice versa).",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Status toggled; returns the updated device",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { device: deviceSchema },
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
  "/pvt/d/devices/e": {
    get: {
      tags: ["Devices"],
      summary: "Device-client self auth-check",
      description:
        "Called by the device client itself (kiosk, counter, KDS, or display) using its own device session cookie to confirm the session is valid and fetch the device's current identity plus its license status. Fails with 403 if the device or its organization/branch has been deactivated.",
      security: [{ deviceCookieAuth: [] }],
      responses: {
        "200": {
          description:
            "Device session is valid; returns the device and its license",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  device: deviceSchema,
                  license: licenseSchema,
                  branding: {
                    type: "object",
                    description:
                      "Branch branding the device themes itself with.",
                    properties: {
                      logoUrl: {
                        type: "string",
                        nullable: true,
                        description:
                          "Short-lived signed URL of the branch logo, or null when none is set.",
                      },
                      primaryColor: { type: "string", example: "#10b981" },
                      languageCode: { type: "string", example: "en" },
                      timezone: { type: "string", example: "Asia/Dubai" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": {
          description: "No device session found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        "403": {
          description: "Device, organization, or branch has been deactivated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/devices/{id}/logs": {
    get: {
      tags: ["Devices"],
      summary: "List a device's activity log",
      description:
        "Newest first. Records sign-ins and sign-outs, session revokes, activation changes, admin page sign-ins (successful and failed) and card terminal mapping.",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
      ],
      responses: {
        "200": {
          description: "Device activity",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  logs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        action: {
                          type: "integer",
                          enum: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                          description:
                            "DeviceLogActionEnum: 1 = SIGNED_IN, 2 = SIGNED_OUT, 3 = SESSION_REVOKED, 4 = ACTIVATED, 5 = DEACTIVATED, 6 = ADMIN_PANEL_ENTERED, 7 = ADMIN_PANEL_ENTRY_FAILED, 8 = TERMINAL_MAPPED, 9 = TERMINAL_UNMAPPED, 10 = STAFF_LOGIN, 11 = STAFF_LOGIN_FAILED, 12 = STAFF_LOGOUT, 13 = STAFF_SESSION_REVOKED",
                        },
                        performedBy: {
                          type: "object",
                          nullable: true,
                          description: "Null when the device did it itself",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            name: { type: "string" },
                          },
                        },
                        metadata: { type: "object", nullable: true },
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
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/d/devices/admin/login": {
    post: {
      tags: ["Devices"],
      summary: "Sign a staff member in to the device's admin pages",
      description:
        "Called by a signed-in device. The staff member gives their registered email or mobile number plus their password or 4-digit PIN. They must belong to the device's organization (and its branch, for a branch user) and hold the device admin permission. Five wrong attempts for one identity on one device lock it for 15 minutes. Returns a short-lived admin token to send in the X-D-Admin header.",
      security: [{ deviceCookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["identity", "method", "secret"],
              properties: {
                identity: {
                  type: "string",
                  description: "Registered email or mobile number",
                },
                method: {
                  type: "integer",
                  enum: [1, 2],
                  description:
                    "DeviceAdminAuthMethodEnum: 1 = PASSWORD, 2 = PIN",
                },
                secret: {
                  type: "string",
                  description: "The password or PIN, depending on method",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Signed in",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  adminToken: { type: "string" },
                  expiresAt: { type: "string", format: "date-time" },
                  expiresInSeconds: { type: "integer", example: 900 },
                  admin: {
                    type: "object",
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "429": { description: "Too many wrong attempts" },
      },
    },
  },
  "/pvt/d/devices/admin/staff-login": {
    post: {
      tags: ["Devices"],
      summary: "Open the admin pages as the staff member already signed in",
      description:
        "Counter and KDS devices. Needs the X-D-Staff header from the staff sign-in, so only the password or PIN is sent; the identity comes from the staff session. Same checks, lockout and 200 response as the admin sign-in. A missing or expired staff token returns 403 DEVICE_STAFF_SESSION_EXPIRED.",
      security: [{ deviceCookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["method", "secret"],
              properties: {
                method: { type: "integer", enum: [1, 2] },
                secret: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Signed in to the admin pages" },
        "400": { $ref: "#/components/responses/ValidationError" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "429": { description: "Too many wrong attempts" },
      },
    },
  },
  "/pvt/d/devices/staff/login": {
    post: {
      tags: ["Devices"],
      summary: "Sign a staff member in on a counter or KDS device",
      description:
        "Counter and KDS devices only. The staff member gives their registered email or mobile number plus their password or 4-digit PIN, and must hold the branch staff permission for that device type (branch:device:staff:counter or branch:device:staff:kds); an organization-level user needs organization all-write. Replaces any staff session already open on the device. Returns a short-lived staff token for the X-D-Staff header and sets a refresh cookie; the session lasts at most 12 hours.",
      security: [{ deviceCookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["identity", "method", "secret"],
              properties: {
                identity: { type: "string" },
                method: { type: "integer", enum: [1, 2] },
                secret: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Signed in",
          content: {
            "application/json": {
              schema: deviceStaffSessionSchema,
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "429": { description: "Too many wrong attempts" },
      },
    },
  },
  "/pvt/d/devices/staff/refresh": {
    post: {
      tags: ["Devices"],
      summary: "Refresh the staff session on this device",
      description:
        "Uses the staff refresh cookie, rotates it and returns a new staff token. Does not extend the session past its 12 hours. 403 DEVICE_STAFF_SESSION_EXPIRED when there is no open staff session.",
      security: [{ deviceCookieAuth: [] }],
      responses: {
        "200": {
          description: "Refreshed",
          content: {
            "application/json": {
              schema: deviceStaffSessionSchema,
            },
          },
        },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/d/devices/staff/logout": {
    post: {
      tags: ["Devices"],
      summary: "Sign the staff member out of this device",
      security: [{ deviceCookieAuth: [] }],
      responses: {
        "204": { description: "Signed out" },
      },
    },
  },
  "/pvt/d/devices/admin/terminal": {
    patch: {
      tags: ["Devices"],
      summary: "Map a card terminal to this device from its admin pages",
      description:
        "Needs the X-D-Admin header from the admin sign-in; a missing or expired token returns 403 DEVICE_ADMIN_SESSION_EXPIRED. Send an empty terminalId to unmap. Only kiosk and counter devices take card payments.",
      security: [{ deviceCookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                terminalId: { type: "string", maxLength: 100, nullable: true },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Device with its new terminal" },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
};
