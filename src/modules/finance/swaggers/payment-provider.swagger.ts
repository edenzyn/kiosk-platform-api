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

export const paymentProviderSwaggerPaths: Record<string, unknown> = {
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
};
