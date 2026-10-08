const shiftVerificationSchema = {
  type: "object",
  description:
    "Sent only when the branch has shifts verified by a shift manager. Give method + secret when the branch verifies with PIN or password, or verificationId + code when it verifies with a one-time code.",
  required: ["managerId"],
  properties: {
    managerId: { type: "string", format: "uuid" },
    method: { type: "integer", description: "1=PASSWORD, 2=PIN" },
    secret: { type: "string" },
    verificationId: { type: "string", format: "uuid" },
    code: { type: "string" },
  },
};

const deviceShiftSchema = {
  type: "object",
  nullable: true,
  properties: {
    id: { type: "string", format: "uuid" },
    staff: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
      },
    },
    startedAt: { type: "string", format: "date-time" },
    currencyCode: { type: "string", nullable: true },
    openingCash: { type: "string", nullable: true },
  },
};

const currentShiftSchema = {
  type: "object",
  properties: {
    shift: deviceShiftSchema,
    isOwnShift: {
      type: "boolean",
      description: "False when the open shift belongs to another staff member",
    },
    currencyCode: {
      type: "string",
      nullable: true,
      description: "Currency of the branch market",
    },
    shiftVerifier: { type: "integer", description: "1=STAFF, 2=SHIFT_MANAGER" },
    managerVerificationMethod: {
      type: "integer",
      description: "1=PIN_OR_PASSWORD, 2=OTP",
    },
  },
};

const shiftTotalSchema = {
  type: "object",
  properties: {
    orderCount: { type: "integer" },
    amount: { type: "string" },
  },
};

const shiftSummarySchema = {
  type: "object",
  properties: {
    shiftId: { type: "string", format: "uuid" },
    startedAt: { type: "string", format: "date-time" },
    endedAt: { type: "string", format: "date-time", nullable: true },
    currencyCode: { type: "string", nullable: true },
    openingCash: { type: "string" },
    cash: shiftTotalSchema,
    qr: shiftTotalSchema,
    card: shiftTotalSchema,
    cancelled: shiftTotalSchema,
    expectedCash: {
      type: "string",
      description: "Opening cash plus the cash collected",
    },
  },
};

const shiftErrorResponses = {
  "401": { $ref: "#/components/responses/Unauthorized" },
  "403": { $ref: "#/components/responses/Forbidden" },
};

export const shiftSwaggerPaths = {
  // ========================================
  // ? DEVICE SHIFTS (mounted /pvt/d/shifts)
  // ========================================
  "/pvt/d/shifts/current": {
    get: {
      tags: ["Shifts"],
      summary: "The shift open on this counter",
      description:
        "Counter devices only; needs the X-D-Staff header. Returns the open shift on the counter (null when there is none), whether it belongs to the signed-in staff member, and how the branch verifies shifts.",
      security: [{ deviceCookieAuth: [] }],
      responses: {
        "200": {
          description: "Current shift",
          content: { "application/json": { schema: currentShiftSchema } },
        },
        ...shiftErrorResponses,
      },
    },
  },
  "/pvt/d/shifts/current/summary": {
    get: {
      tags: ["Shifts"],
      summary: "Live totals of the staff member's open shift",
      description:
        "Completed payments per method and cancelled orders linked to the shift. 409 SHIFT_NOT_STARTED when no shift is open, 409 SHIFT_HELD_BY_ANOTHER_STAFF when it belongs to someone else.",
      security: [{ deviceCookieAuth: [] }],
      responses: {
        "200": {
          description: "Shift summary",
          content: { "application/json": { schema: shiftSummarySchema } },
        },
        ...shiftErrorResponses,
      },
    },
  },
  "/pvt/d/shifts/managers": {
    get: {
      tags: ["Shifts"],
      summary: "People who can verify a shift on this counter",
      description:
        "Active users of the branch holding branch:shift:manage or branch all-write, plus organization-level users with organization all-write. The signed-in staff member is left out because nobody verifies their own shift.",
      security: [{ deviceCookieAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        { name: "search", in: "query", schema: { type: "string" } },
      ],
      responses: {
        "200": {
          description: "Shift managers",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  managers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        hasPin: { type: "boolean" },
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
        ...shiftErrorResponses,
      },
    },
  },
  "/pvt/d/shifts/verification-code": {
    post: {
      tags: ["Shifts"],
      summary: "Send a one-time code to a shift manager",
      description:
        "Only when the branch verifies shifts with a one-time code. The same code goes to the manager's email and mobile number, whichever exist. Returns the verificationId to send back with the code when starting or ending the shift.",
      security: [{ deviceCookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["managerId"],
              properties: {
                managerId: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Code sent",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  verificationId: { type: "string", format: "uuid" },
                  sentTo: {
                    type: "array",
                    items: { type: "string" },
                    description: "Masked email and mobile number",
                  },
                },
              },
            },
          },
        },
        ...shiftErrorResponses,
      },
    },
  },
  "/pvt/d/shifts/start": {
    post: {
      tags: ["Shifts"],
      summary: "Start the staff member's shift on this counter",
      description:
        "Needs an open business day. One open shift per counter and per staff member. Orders, collections and cancellations on a counter need an open shift.",
      security: [{ deviceCookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["openingCash"],
              properties: {
                openingCash: { type: "number", minimum: 0 },
                verification: shiftVerificationSchema,
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Shift started",
          content: { "application/json": { schema: currentShiftSchema } },
        },
        ...shiftErrorResponses,
        "409": {
          description:
            "Business day closed, or a shift is already open on this counter or for this staff member",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  "/pvt/d/shifts/end": {
    post: {
      tags: ["Shifts"],
      summary: "End the staff member's shift",
      description:
        "Saves the shift totals and closes it. Closing the business day also closes any shift still open.",
      security: [{ deviceCookieAuth: [] }],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                note: { type: "string", nullable: true, maxLength: 500 },
                verification: shiftVerificationSchema,
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Shift ended",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { summary: shiftSummarySchema },
              },
            },
          },
        },
        ...shiftErrorResponses,
      },
    },
  },
};
