export const organizationSwaggerPaths: Record<string, unknown> = {
  "/pvt/organizations": {
    get: {
      tags: ["Organizations"],
      summary: "List all organizations",
      responses: {
        "200": {
          description: "List of organizations",
        },
      },
    },
    post: {
      tags: ["Organizations"],
      summary: "Create a new organization",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", minLength: 2, maxLength: 255 },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Organization successfully created",
        },
        "409": {
          description: "Organization name already exists",
        },
      },
    },
  },
  "/pvt/organizations/{id}": {
    get: {
      tags: ["Organizations"],
      summary: "Get organization by ID",
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
          description: "Organization details",
        },
        "404": {
          description: "Organization not found",
        },
      },
    },
    patch: {
      tags: ["Organizations"],
      summary: "Update organization details",
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
                name: { type: "string", minLength: 2, maxLength: 255 },
                isActive: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Organization successfully updated",
        },
        "404": {
          description: "Organization not found",
        },
        "409": {
          description: "Organization name already exists",
        },
      },
    },
    delete: {
      tags: ["Organizations"],
      summary: "Delete an organization",
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
          description: "Organization successfully deleted",
        },
        "404": {
          description: "Organization not found",
        },
      },
    },
  },
};
