const businessDayUserSchema = {
  type: "object",
  nullable: true,
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
  },
};

const businessDaySchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    businessDate: {
      type: "string",
      format: "date",
      description: "Branch time zone; the date the manager opened it on",
    },
    status: {
      type: "integer",
      enum: [1, 2],
      description: "BusinessDayStatusEnum: 1 = OPEN, 2 = CLOSED",
    },
    isOrderingPaused: {
      type: "boolean",
      description: "Open, but not taking new orders for now",
    },
    openedAt: { type: "string", format: "date-time" },
    openedBy: { ...businessDayUserSchema, nullable: false },
    closedAt: { type: "string", format: "date-time", nullable: true },
    closedBy: { ...businessDayUserSchema, description: "Null while open" },
  },
};

const currentBusinessDayResponse = {
  description: "Today at the branch and its business day",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          businessDate: {
            type: "string",
            format: "date",
            description: "Today at the branch",
          },
          timezone: { type: "string" },
          activeOrderCount: {
            type: "integer",
            description:
              "Paid orders of the day that are not completed or cancelled yet",
          },
          day: {
            ...businessDaySchema,
            nullable: true,
            description:
              "The open day (it may be from an earlier date if nobody closed it), otherwise today's day once closed; null before today is opened",
          },
        },
      },
    },
  },
};

const branchScopeNote =
  "Branch scope only: the request must carry a branch (an organization user has to switch into one).";

export const businessDaySwaggerPaths = {
  // ========================================
  // ? USER BUSINESS DAYS (mounted /pvt/u/business-days)
  // ========================================
  "/pvt/u/business-days": {
    get: {
      tags: ["Business Days"],
      summary: "List the branch's business days",
      description: `${branchScopeNote} Newest first by default.`,
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        {
          name: "fromDate",
          in: "query",
          schema: { type: "string", format: "date" },
        },
        {
          name: "toDate",
          in: "query",
          schema: { type: "string", format: "date" },
        },
        {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"] },
        },
      ],
      responses: {
        "200": {
          description: "Business days",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  businessDays: {
                    type: "array",
                    items: businessDaySchema,
                  },
                  timezone: { type: "string" },
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
  "/pvt/u/business-days/current": {
    get: {
      tags: ["Business Days"],
      summary: "Get the current business day",
      description: `${branchScopeNote} Returns today's date at the branch and its business day.`,
      responses: {
        "200": currentBusinessDayResponse,
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/u/business-days/open": {
    post: {
      tags: ["Business Days"],
      summary: "Open or reopen today's business day",
      description: `${branchScopeNote} Opens today's business day, or reopens it if it was closed earlier today; tokens carry on from where they stopped. Kiosks in the branch get a business-day.opened event. 409 RESOURCE_ALREADY_EXISTS when today is already open, or PREVIOUS_BUSINESS_DAY_OPEN when an earlier day is still open and closePreviousDay is not true.`,
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                closePreviousDay: {
                  type: "boolean",
                  default: false,
                  description:
                    "Close a day still open from an earlier date first, in the same step",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": currentBusinessDayResponse,
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "409": {
          description: "The business day is already open",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  "/pvt/u/business-days/close": {
    post: {
      tags: ["Business Days"],
      summary: "Close the current business day",
      description: `${branchScopeNote} Closes the open business day, whatever its date. Kiosks in the branch get a business-day.closed event and stop taking orders. 409 when no day is open.`,
      responses: {
        "200": currentBusinessDayResponse,
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "409": {
          description: "There is no open business day to close",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  "/pvt/u/business-days/pause-orders": {
    post: {
      tags: ["Business Days"],
      summary: "Pause new orders on the open business day",
      description: `${branchScopeNote} The day stays open and orders in progress carry on, but kiosks stop taking new orders and get a business-day.orders-paused event. 409 when no day is open or orders are already paused.`,
      responses: {
        "200": currentBusinessDayResponse,
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "409": {
          description: "No open business day, or orders are already paused",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  "/pvt/u/business-days/resume-orders": {
    post: {
      tags: ["Business Days"],
      summary: "Resume orders on the open business day",
      description: `${branchScopeNote} Kiosks take orders again and get a business-day.orders-resumed event. 409 when no day is open or orders are not paused.`,
      responses: {
        "200": currentBusinessDayResponse,
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "409": {
          description: "No open business day, or orders are not paused",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },
  "/pvt/u/business-days/{id}/logs": {
    get: {
      tags: ["Business Days"],
      summary: "Get a business day's audit log",
      description: `${branchScopeNote} Every open, close and reopen of the day, oldest first, with who did it.`,
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
          description: "Audit log",
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
                          enum: [1, 2, 3, 4, 5],
                          description:
                            "BusinessDayActionEnum: 1 = OPENED, 2 = CLOSED, 3 = REOPENED, 4 = ORDERS_PAUSED, 5 = ORDERS_RESUMED",
                        },
                        performedBy: {
                          ...businessDayUserSchema,
                          nullable: false,
                        },
                        createdAt: { type: "string", format: "date-time" },
                      },
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
        "404": {
          description: "Business day not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
  },

  // ========================================
  // ? DEVICE BUSINESS DAYS (mounted /pvt/d/business-days)
  // ========================================
  "/pvt/d/business-days/current": {
    get: {
      tags: ["Business Days"],
      summary: "Is the device's branch open for orders",
      description:
        "Kiosks take orders only while a business day is open and ordering is not paused. Listen for business-day.opened / business-day.closed / business-day.orders-paused / business-day.orders-resumed on the device socket to stay in sync.",
      security: [{ deviceCookieAuth: [] }],
      responses: {
        "200": {
          description: "Business day status",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  isOpen: { type: "boolean" },
                  isOrderingPaused: {
                    type: "boolean",
                    description: "Open, but new orders are on hold",
                  },
                  businessDate: {
                    type: "string",
                    format: "date",
                    nullable: true,
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
};
