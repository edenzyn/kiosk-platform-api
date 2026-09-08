export const marketSwaggerPaths: Record<string, unknown> = {
  // ========================================
  // ? PLATFORM-SIDE MARKET MANAGEMENT (mounted /pvt/p/markets)
  // ========================================
  "/pvt/p/markets/active": {
    get: {
      tags: ["Markets"],
      summary: "List active markets",
      description:
        "Lightweight lookup for populating market selectors (e.g. assigning markets to an organization invite). Any authenticated platform user can call this.",
      responses: {
        "200": {
          description: "Active markets",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  markets: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        countryCode: { type: "string" },
                        name: { type: "string" },
                        currencyCode: { type: "string" },
                        isActive: { type: "boolean" },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" },
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
  "/pvt/p/markets/": {
    get: {
      tags: ["Markets"],
      summary: "List markets",
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "isActive", in: "query", schema: { type: "boolean" } },
        {
          name: "sortBy",
          in: "query",
          schema: {
            type: "string",
            enum: ["name", "countryCode", "isActive", "createdAt"],
          },
        },
        {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"] },
        },
      ],
      responses: {
        "200": {
          description: "Paginated list of markets",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  markets: {
                    type: "array",
                    items: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  countryCode: { type: "string" },
                  name: { type: "string" },
                  currencyCode: { type: "string" },
                  isActive: { type: "boolean" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" },
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
    post: {
      tags: ["Markets"],
      summary: "Create a market",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["countryCode", "name", "currencyCode"],
              properties: {
                countryCode: {
                  type: "string",
                  minLength: 2,
                  maxLength: 2,
                  description: "2-letter ISO country code, e.g. IN",
                },
                name: { type: "string", minLength: 2, maxLength: 100 },
                currencyCode: {
                  type: "string",
                  minLength: 3,
                  maxLength: 3,
                  description: "3-letter ISO currency code, e.g. INR",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Market created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { market: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  countryCode: { type: "string" },
                  name: { type: "string" },
                  currencyCode: { type: "string" },
                  isActive: { type: "boolean" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" },
                },
              } },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "409": { description: "A market for this country code already exists" },
      },
    },
  },
  "/pvt/p/markets/{id}": {
    patch: {
      tags: ["Markets"],
      summary: "Update a market's name",
      description:
        "Only the display name can be changed. countryCode and currencyCode are immutable after creation since they underpin plans, pricing, and licenses already issued in this market.",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", minLength: 2, maxLength: 100 },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Market updated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { market: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  countryCode: { type: "string" },
                  name: { type: "string" },
                  currencyCode: { type: "string" },
                  isActive: { type: "boolean" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" },
                },
              } },
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
  "/pvt/p/markets/{id}/status": {
    patch: {
      tags: ["Markets"],
      summary: "Toggle a market's active status",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": {
          description: "Status toggled; returns the updated market",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { market: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  countryCode: { type: "string" },
                  name: { type: "string" },
                  currencyCode: { type: "string" },
                  isActive: { type: "boolean" },
                  createdAt: { type: "string", format: "date-time" },
                  updatedAt: { type: "string", format: "date-time" },
                },
              } },
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
