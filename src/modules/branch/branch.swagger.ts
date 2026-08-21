const branchSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    organizationId: { type: "string", format: "uuid" },
    name: { type: "string" },
    email: { type: "string", format: "email", nullable: true },
    mobile: { type: "string", nullable: true },
    isActive: { type: "boolean" },
    country: { type: "string" },
    state: { type: "string" },
    city: { type: "string" },
    postalCode: { type: "string" },
    area: { type: "string", nullable: true },
    landmark: { type: "string", nullable: true },
    address: { type: "string" },
    timezone: { type: "string" },
    latitude: { type: "number", nullable: true },
    longitude: { type: "number", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    createdBy: { type: "string", format: "uuid", nullable: true },
    updatedBy: { type: "string", format: "uuid", nullable: true },
  },
};

export const branchSwaggerPaths: Record<string, unknown> = {
  "/pvt/u/branches/": {
    get: {
      tags: ["Branches"],
      summary: "List branches within the effective tenant's organization",
      description:
        "Returns a paginated list of branches. When the caller's effective tenant is scoped to a single branch, results are restricted to that branch.",
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { name: "search", in: "query", schema: { type: "string" } },
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
          description: "Paginated list of branches",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  branches: { type: "array", items: branchSchema },
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
      tags: ["Branches"],
      summary: "Create a branch",
      description:
        "Creates a branch under the caller's organization and provisions its default branch roles and permissions.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: [
                "organizationId",
                "name",
                "country",
                "state",
                "city",
                "postalCode",
                "address",
                "timezone",
              ],
              properties: {
                organizationId: { type: "string", format: "uuid" },
                name: { type: "string", maxLength: 255 },
                email: { type: "string", format: "email", nullable: true },
                mobile: {
                  type: "string",
                  maxLength: 50,
                  nullable: true,
                  description: "Must be a valid mobile number",
                },
                country: { type: "string", maxLength: 100 },
                state: { type: "string", maxLength: 100 },
                city: { type: "string", maxLength: 100 },
                postalCode: { type: "string", maxLength: 20 },
                area: { type: "string", maxLength: 255, nullable: true },
                landmark: { type: "string", maxLength: 255, nullable: true },
                address: { type: "string" },
                timezone: { type: "string", maxLength: 100 },
                latitude: { type: "number", nullable: true },
                longitude: { type: "number", nullable: true },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Branch created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { branch: branchSchema },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description:
            "Missing the required permission, or organizationId does not match the caller's effective organization",
        },
      },
    },
  },
  "/pvt/u/branches/options": {
    get: {
      tags: ["Branches"],
      summary: "List branches for filter dropdowns",
      description:
        "Returns a lightweight id/name list of branches within the effective tenant's organization, for populating filter dropdowns.",
      responses: {
        "200": {
          description: "List of branch id/name pairs",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
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
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
      },
    },
  },
  "/pvt/u/branches/{id}": {
    put: {
      tags: ["Branches"],
      summary: "Update a branch",
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
                name: { type: "string", maxLength: 255 },
                email: { type: "string", format: "email", nullable: true },
                mobile: {
                  type: "string",
                  maxLength: 50,
                  nullable: true,
                  description: "Must be a valid mobile number",
                },
                country: { type: "string", maxLength: 100 },
                state: { type: "string", maxLength: 100 },
                city: { type: "string", maxLength: 100 },
                postalCode: { type: "string", maxLength: 20 },
                area: { type: "string", maxLength: 255, nullable: true },
                landmark: { type: "string", maxLength: 255, nullable: true },
                address: { type: "string" },
                timezone: { type: "string", maxLength: 100 },
                latitude: { type: "number", nullable: true },
                longitude: { type: "number", nullable: true },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Branch updated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { branch: branchSchema },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description:
            "Missing the required permission, or the branch belongs to a different organization than the caller's effective tenant",
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
};
