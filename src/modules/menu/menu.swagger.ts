const menuCategorySchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    organizationId: { type: "string", format: "uuid" },
    branchId: { type: "string", format: "uuid" },
    name: { type: "string" },
    description: { type: "string", nullable: true },
    banner: { type: "string", nullable: true },
    isListed: { type: "boolean" },
    isActive: { type: "boolean" },
    displayOrder: { type: "integer" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    createdBy: { type: "string", format: "uuid", nullable: true },
    updatedBy: { type: "string", format: "uuid", nullable: true },
  },
};

const menuCategoryWithItemCountSchema = {
  allOf: [
    menuCategorySchema,
    {
      type: "object",
      properties: {
        itemCount: { type: "integer" },
      },
    },
  ],
};

const menuItemSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    organizationId: { type: "string", format: "uuid" },
    branchId: { type: "string", format: "uuid" },
    categoryId: { type: "string", format: "uuid" },
    name: { type: "string" },
    description: { type: "string", nullable: true },
    price: { type: "string" },
    code: { type: "string", nullable: true },
    image: { type: "string", nullable: true },
    takeawayChargeEnabled: { type: "boolean" },
    takeawayChargeAmount: { type: "string", nullable: true },
    isFeatured: { type: "boolean" },
    isListed: { type: "boolean" },
    calories: { type: "string", nullable: true },
    dietaryType: {
      type: "integer",
      enum: [1, 2],
      description: "1=VEGETARIAN, 2=NON_VEGETARIAN",
    },
    hasAlcohol: { type: "boolean" },
    isSpicy: { type: "boolean" },
    displayOrder: { type: "integer" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    createdBy: { type: "string", format: "uuid", nullable: true },
    updatedBy: { type: "string", format: "uuid", nullable: true },
  },
};

export const menuSwaggerPaths: Record<string, unknown> = {
  "/pvt/u/menu/categories": {
    get: {
      tags: ["Menu"],
      summary: "List menu categories",
      description:
        "Returns every menu category for the effective branch, each annotated with its item count. Requires a branch-scoped effective tenant.",
      parameters: [
        { name: "isActive", in: "query", schema: { type: "boolean" } },
        { name: "isListed", in: "query", schema: { type: "boolean" } },
        { name: "search", in: "query", schema: { type: "string" } },
      ],
      responses: {
        "200": {
          description: "List of menu categories",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  categories: {
                    type: "array",
                    items: menuCategoryWithItemCountSchema,
                  },
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
      tags: ["Menu"],
      summary: "Create a menu category",
      description:
        "Creates a new menu category under the effective branch. Requires a branch-scoped effective tenant.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", maxLength: 100 },
                description: { type: "string", nullable: true },
                banner: { type: "string", maxLength: 255, nullable: true },
                isListed: { type: "boolean" },
                displayOrder: { type: "integer", minimum: 0 },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Category created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { category: menuCategorySchema },
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
  "/pvt/u/menu/items": {
    get: {
      tags: ["Menu"],
      summary: "List menu items for a category",
      description:
        "Returns every item under the given category for the effective branch. Requires a branch-scoped effective tenant.",
      parameters: [
        {
          name: "categoryId",
          in: "query",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        { name: "isListed", in: "query", schema: { type: "boolean" } },
        { name: "search", in: "query", schema: { type: "string" } },
      ],
      responses: {
        "200": {
          description: "List of menu items",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  items: { type: "array", items: menuItemSchema },
                },
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
    post: {
      tags: ["Menu"],
      summary: "Create a menu item",
      description:
        "Creates a new item under the given category. The category must belong to the effective branch.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["categoryId", "name", "price"],
              properties: {
                categoryId: { type: "string", format: "uuid" },
                name: { type: "string", maxLength: 150 },
                description: { type: "string", nullable: true },
                price: { type: "number", minimum: 0 },
                code: { type: "string", maxLength: 100, nullable: true },
                takeawayChargeEnabled: { type: "boolean" },
                takeawayChargeAmount: {
                  type: "number",
                  minimum: 0,
                  nullable: true,
                  description: "Required when takeawayChargeEnabled is true",
                },
                isFeatured: { type: "boolean" },
                isListed: { type: "boolean" },
                calories: { type: "number", minimum: 0, nullable: true },
                dietaryType: {
                  type: "integer",
                  enum: [1, 2],
                  description: "1=VEGETARIAN, 2=NON_VEGETARIAN",
                },
                hasAlcohol: { type: "boolean" },
                isSpicy: { type: "boolean" },
                displayOrder: { type: "integer", minimum: 0 },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Item created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { item: menuItemSchema },
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
};
