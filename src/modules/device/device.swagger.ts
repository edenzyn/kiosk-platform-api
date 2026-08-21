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
      description: "1=KIOSK, 2=COUNTER, 3=KDS, 4=DIGITAL_DISPLAY",
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
          description: "Filter by device type (1=KIOSK, 2=COUNTER, 3=KDS, 4=DIGITAL_DISPLAY)",
          schema: { type: "integer", enum: [1, 2, 3, 4] },
        },
        {
          name: "branchId",
          in: "query",
          description: "Ignored when the caller's effective tenant already scopes to a branch",
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
                  description: "1=KIOSK, 2=COUNTER, 3=KDS, 4=DIGITAL_DISPLAY",
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
    put: {
      tags: ["Devices"],
      summary: "Update a device",
      description:
        "Partially updates a device's branch, name, device code, PIN, or type. Omitted fields are left unchanged; a field explicitly set to null clears it where nullable.",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
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
                deviceType: {
                  type: "integer",
                  nullable: true,
                  enum: [1, 2, 3, 4],
                  description: "1=KIOSK, 2=COUNTER, 3=KDS, 4=DIGITAL_DISPLAY",
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
  "/pvt/u/devices/{id}/status": {
    patch: {
      tags: ["Devices"],
      summary: "Toggle a device's active status",
      description: "Flips the device's isActive flag (active becomes inactive and vice versa).",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
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
          description: "Device session is valid; returns the device and its license",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  device: deviceSchema,
                  license: licenseSchema,
                },
              },
            },
          },
        },
        "401": {
          description: "No device session found",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
        },
        "403": {
          description: "Device, organization, or branch has been deactivated",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
};
