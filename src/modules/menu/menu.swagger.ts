const menuCategorySchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    organizationId: { type: "string", format: "uuid" },
    branchId: { type: "string", format: "uuid" },
    name: { type: "string" },
    description: { type: "string", nullable: true },
    image: {
      type: "string",
      nullable: true,
      description: "Storage key of the category image.",
    },
    imageUrl: {
      type: "string",
      nullable: true,
      description: "Short-lived signed URL for displaying the image.",
    },
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
    image: {
      type: "string",
      nullable: true,
      description: "Storage key of the item image.",
    },
    imageUrl: {
      type: "string",
      nullable: true,
      description: "Short-lived signed URL for displaying the image.",
    },
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
  "/pvt/u/menu/items/image": {
    put: {
      tags: ["Menu"],
      summary: "Request a menu item image upload URL",
      description:
        "Returns a presigned URL to PUT the image to, and the key to send as `image` when creating the item. The item create call verifies the upload landed.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["contentType", "fileSize"],
              properties: {
                contentType: {
                  type: "string",
                  enum: ["image/png", "image/jpeg", "image/webp"],
                },
                fileSize: {
                  type: "integer",
                  description: "Size in bytes, max 5MB",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Upload URL issued",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  image: { type: "string" },
                  uploadUrl: { type: "string" },
                  expiresIn: { type: "integer" },
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
  "/pvt/u/menu/categories/image": {
    put: {
      tags: ["Menu"],
      summary: "Request a menu category image upload URL",
      description:
        "Returns a presigned URL to PUT the image to, and the key to send as `image` when creating the category. The category create call verifies the upload landed.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["contentType", "fileSize"],
              properties: {
                contentType: {
                  type: "string",
                  enum: ["image/png", "image/jpeg", "image/webp"],
                },
                fileSize: {
                  type: "integer",
                  description: "Size in bytes, max 5MB",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Upload URL issued",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  image: { type: "string" },
                  uploadUrl: { type: "string" },
                  expiresIn: { type: "integer" },
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
  "/pvt/u/menu/categories": {
    get: {
      tags: ["Menu"],
      summary: "List menu categories",
      description:
        "Returns every menu category for the effective branch, each annotated with its item count. Requires a branch-scoped effective tenant.",
      parameters: [
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
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
                name: { type: "string", minLength: 2, maxLength: 100 },
                description: { type: "string", nullable: true },
                image: {
                  type: "string",
                  nullable: true,
                  description:
                    "Key returned by PUT /pvt/u/menu/categories/image, after the file has been uploaded to its URL.",
                },
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
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        {
          name: "categoryId",
          in: "query",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        { name: "isListed", in: "query", schema: { type: "boolean" } },
        {
          name: "dietaryType",
          in: "query",
          description: "1=VEGETARIAN, 2=NON_VEGETARIAN",
          schema: { type: "integer", enum: [1, 2] },
        },
        { name: "search", in: "query", schema: { type: "string" } },
        {
          name: "sortBy",
          in: "query",
          description: "Defaults to the merchant display order when omitted",
          schema: { type: "string", enum: ["name", "price", "createdAt"] },
        },
        {
          name: "sortOrder",
          in: "query",
          schema: { type: "string", enum: ["asc", "desc"] },
        },
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
                  total: { type: "integer" },
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  totalPages: { type: "integer" },
                  currencyCode: {
                    type: "string",
                    description:
                      "ISO currency code of the branch's market - all item prices are denominated in it.",
                  },
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
                name: { type: "string", minLength: 2, maxLength: 100 },
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
                image: {
                  type: "string",
                  nullable: true,
                  description:
                    "Key returned by PUT /pvt/u/menu/items/image, after the file has been uploaded to its URL.",
                },
                modifiers: {
                  type: "array",
                  description:
                    "Modifier groups saved with the item in one transaction.",
                  items: {
                    type: "object",
                    required: [
                      "name",
                      "selectionType",
                      "minSelection",
                      "maxSelection",
                      "displayOrder",
                      "options",
                    ],
                    properties: {
                      name: { type: "string", minLength: 2, maxLength: 100 },
                      selectionType: {
                        type: "integer",
                        enum: [1, 2, 3],
                        description:
                          "1=SINGLE_REQUIRED (min 1, max 1), 2=SINGLE (min 0, max 1), 3=MULTIPLE (min <= max <= option count)",
                      },
                      minSelection: { type: "integer", minimum: 0 },
                      maxSelection: { type: "integer", minimum: 1 },
                      displayOrder: { type: "integer", minimum: 0 },
                      options: {
                        type: "array",
                        minItems: 1,
                        items: {
                          type: "object",
                          required: ["name", "price", "displayOrder"],
                          properties: {
                            name: {
                              type: "string",
                              minLength: 1,
                              maxLength: 100,
                            },
                            price: { type: "number", minimum: 0 },
                            isDefault: {
                              type: "boolean",
                              description:
                                "Defaults count must not exceed maxSelection",
                            },
                            displayOrder: { type: "integer", minimum: 0 },
                          },
                        },
                      },
                    },
                  },
                },
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
