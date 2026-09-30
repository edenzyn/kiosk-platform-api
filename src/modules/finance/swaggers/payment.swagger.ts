const marketSummarySchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    countryCode: { type: "string" },
    currencyCode: { type: "string" },
  },
};

const mappingSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    providerId: { type: "string", format: "uuid" },
    marketId: { type: "string", format: "uuid" },
    paymentMethod: {
      type: "integer",
      enum: [1, 2],
      description: "TenantPaymentMethodEnum: 1 = QR, 2 = CARD",
    },
    isActive: { type: "boolean" },
    market: marketSummarySchema,
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const providerSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    slug: { type: "string", example: "razorpay" },
    isActive: { type: "boolean" },
    mappings: { type: "array", items: mappingSchema },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

const createMappingSchema = {
  type: "object",
  required: ["marketId", "paymentMethod"],
  properties: {
    marketId: { type: "string", format: "uuid" },
    paymentMethod: {
      type: "integer",
      enum: [1, 2],
      description: "TenantPaymentMethodEnum: 1 = QR, 2 = CARD",
    },
  },
};

const updateMappingSchema = {
  type: "object",
  required: ["marketId", "paymentMethod"],
  properties: {
    ...createMappingSchema.properties,
    id: {
      type: "string",
      format: "uuid",
      description:
        "Set for an existing mapping (only its isActive flag is applied); omit to create a new one.",
    },
    isActive: { type: "boolean", default: true },
  },
};

const providerResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: { provider: providerSchema },
      },
    },
  },
});

const providerIdParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const writeErrorResponses = {
  "400": { $ref: "#/components/responses/ValidationError" },
  "401": { $ref: "#/components/responses/Unauthorized" },
  "403": { $ref: "#/components/responses/Forbidden" },
};

export const paymentSwaggerPaths: Record<string, unknown> = {
  // ========================================
  // ? PLATFORM-SIDE PAYMENT PROVIDER MANAGEMENT (mounted /pvt/p/payment-providers)
  // ========================================
  "/pvt/p/payment-providers/": {
    get: {
      tags: ["Payment Providers"],
      summary: "List payment providers",
      description:
        "Returns a page of payment providers with their market and payment-method mappings. Search matches the name or slug.",
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
            enum: ["name", "slug", "createdAt"],
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
          description: "Paginated list of payment providers with mappings",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  providers: { type: "array", items: providerSchema },
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
  "/pvt/p/payment-providers/{id}": {
    patch: {
      tags: ["Payment Providers"],
      summary: "Update a payment provider's market mappings",
      description:
        "Mappings are never deleted: send an existing mapping (with its id) to activate or deactivate it, or a new one (without an id) to add it. Mappings left out of the payload are unchanged.",
      parameters: [providerIdParameter],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                mappings: { type: "array", items: updateMappingSchema },
              },
            },
          },
        },
      },
      responses: {
        "200": providerResponse("Payment provider updated"),
        ...writeErrorResponses,
        "404": { $ref: "#/components/responses/NotFound" },
        "409": {
          description:
            "This payment method is already mapped to the market for this provider",
        },
      },
    },
  },
  "/pvt/p/payment-providers/{id}/status": {
    patch: {
      tags: ["Payment Providers"],
      summary: "Toggle a payment provider's active status",
      parameters: [providerIdParameter],
      responses: {
        "200": providerResponse("Payment provider status toggled"),
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  // ========================================
  // ? BRANCH PAYMENT CONFIGS (mounted /pvt/u/payment-configs)
  // ========================================
  "/pvt/u/payment-configs/": {
    get: {
      tags: ["Payment Providers"],
      summary: "Get the branch's payment configs",
      description:
        "Returns the branch's saved configs and the providers available in its market. Configs are returned as stored; secret keys (clientSecret, securityToken) hold their encrypted value.",
      responses: {
        "200": { description: "Configs and provider options" },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
    put: {
      tags: ["Payment Providers"],
      summary: "Save the branch's config for a provider",
      description:
        "PhonePe QR takes clientId, clientSecret and clientVersion. Pine Labs card takes merchantId and securityToken (the terminal id is set per device). Secrets are encrypted; leave one blank to keep the stored value. Enabling a provider disables the branch's other provider for the same method.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["mapperId", "isActive", "config"],
              properties: {
                mapperId: { type: "string", format: "uuid" },
                isActive: { type: "boolean" },
                config: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Configs and provider options" },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/payment-configs/cash": {
    put: {
      tags: ["Payment Providers"],
      summary: "Switch cash payments on or off for the branch",
      description:
        "Cash needs no provider; it is on by default. It can only be switched off while QR or card is enabled, since a branch needs at least one payment method.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["isEnabled"],
              properties: { isEnabled: { type: "boolean" } },
            },
          },
        },
      },
      responses: {
        "200": { description: "Configs and provider options" },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/u/payment-configs/test": {
    post: {
      tags: ["Payment Providers"],
      summary: "Test provider credentials before saving them",
      description:
        "Tests the credentials as entered, without saving them (PhonePe QR: requests an OAuth token). A blank secret is tested with the saved one. Saving a testable provider re-runs this test and records last_connection_test. Other providers aren't testable yet.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["mapperId", "config"],
              properties: {
                mapperId: { type: "string", format: "uuid" },
                config: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "The credentials work: { isSuccessful: true }" },
        "400": {
          description:
            "The provider rejected the credentials, or testing isn't available for it",
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" },
        "503": { description: "The provider couldn't be reached" },
      },
    },
  },
};
