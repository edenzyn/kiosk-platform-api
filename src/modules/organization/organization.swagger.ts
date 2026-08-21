export const organizationSwaggerPaths: Record<string, unknown> = {
  "/pvt/p/organizations/invite": {
    post: {
      tags: ["Organizations"],
      summary: "Invite a new organization owner",
      description:
        "Sends an invitation email; the organization and its first admin user are only created once the owner accepts via POST /auth/o/accept-invite.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["organizationName", "name", "email"],
              properties: {
                organizationName: { type: "string", minLength: 2, maxLength: 255 },
                name: { type: "string", minLength: 2, maxLength: 100, description: "Owner's name" },
                email: { type: "string", format: "email", description: "Owner's email" },
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
              schema: {
                type: "object",
                properties: { message: { type: "string" } },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "409": { description: "Email already invited or already belongs to an organization" },
      },
    },
  },
  "/pvt/p/organizations": {
    get: {
      tags: ["Organizations"],
      summary: "List organizations",
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { name: "search", in: "query", schema: { type: "string" } },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["active", "inactive", "all"] },
        },
        {
          name: "sortBy",
          in: "query",
          schema: { type: "string", enum: ["name", "isActive", "createdAt"] },
        },
        {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"] },
        },
      ],
      responses: {
        "200": {
          description: "Paginated list of organizations",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  organizations: { type: "array", items: { type: "object" } },
                  total: { type: "integer" },
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  totalPages: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/pvt/p/organizations/{id}/status": {
    patch: {
      tags: ["Organizations"],
      summary: "Toggle an organization's active status",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": {
          description: "Status toggled; returns the updated organization",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { organization: { type: "object" } },
              },
            },
          },
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
};
