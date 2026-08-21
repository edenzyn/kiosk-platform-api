const RoleEntitySchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    organizationId: { type: "string", format: "uuid", nullable: true },
    branchId: { type: "string", format: "uuid", nullable: true },
    name: { type: "string", nullable: true },
    description: { type: "string", nullable: true },
    rank: { type: "integer" },
    isSystem: { type: "boolean" },
    isActive: { type: "boolean", nullable: true },
    createdAt: { type: "string", format: "date-time", nullable: true },
    updatedAt: { type: "string", format: "date-time", nullable: true },
    createdBy: { type: "string", format: "uuid", nullable: true },
    updatedBy: { type: "string", format: "uuid", nullable: true },
  },
};

const GetRolesResponseItemSchema = {
  type: "object",
  properties: {
    ...RoleEntitySchema.properties,
    memberCount: { type: "integer" },
  },
};

const PermissionEntitySchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    key: { type: "string" },
    description: { type: "string", nullable: true },
    scope: {
      type: "integer",
      description: "1=Platform, 2=Organization, 3=Branch, 4=Reseller, 5=Common",
    },
    isPrivileged: { type: "boolean" },
    isActive: { type: "boolean" },
    createdAt: { type: "string", format: "date-time", nullable: true },
    updatedAt: { type: "string", format: "date-time", nullable: true },
    createdBy: { type: "string", format: "uuid", nullable: true },
    updatedBy: { type: "string", format: "uuid", nullable: true },
  },
};

const PermissionEntityWithAssignedSchema = {
  type: "object",
  properties: {
    ...PermissionEntitySchema.properties,
    assigned: {
      type: "boolean",
      description: "True when the permission is assigned to the requested entity",
    },
    isViaRole: {
      type: "boolean",
      description: "True when the permission is assigned via a role rather than directly",
    },
  },
};

const PermissionMapperEntitySchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    entityType: { type: "integer", description: "1=User, 2=Role" },
    entityId: { type: "string", format: "uuid" },
    permissionId: { type: "string", format: "uuid" },
    organizationId: { type: "string", format: "uuid", nullable: true },
    branchId: { type: "string", format: "uuid", nullable: true },
    isActive: { type: "boolean" },
    createdAt: { type: "string", format: "date-time", nullable: true },
    updatedAt: { type: "string", format: "date-time", nullable: true },
    createdBy: { type: "string", format: "uuid", nullable: true },
    updatedBy: { type: "string", format: "uuid", nullable: true },
  },
};

const RoleUserSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    organizationId: { type: "string", format: "uuid", nullable: true },
    branchId: { type: "string", format: "uuid", nullable: true },
    name: { type: "string", nullable: true },
    email: { type: "string", format: "email", nullable: true },
    mobile: { type: "string", nullable: true },
    userType: { type: "string" },
    isActive: { type: "boolean", nullable: true },
    createdAt: { type: "string", format: "date-time", nullable: true },
    updatedAt: { type: "string", format: "date-time", nullable: true },
  },
};

const RoleIdParam = {
  name: "roleId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const PermissionIdParam = {
  name: "permissionId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const UserIdParam = {
  name: "userId",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const EntityTypeQueryParam = {
  name: "entityType",
  in: "query",
  description: "1=User, 2=Role",
  schema: { type: "integer", enum: [1, 2], nullable: true },
};

export const rbacSwaggerPaths: Record<string, unknown> = {
  "/pvt/u/rbac/roles": {
    get: {
      tags: ["RBAC"],
      summary: "List roles for the effective tenant",
      description:
        "Returns roles scoped to the caller's effective organization/branch. System roles are included when `sys` is true or when the caller's own scope differs from the effective tenant's scope.",
      parameters: [
        { name: "search", in: "query", schema: { type: "string", maxLength: 255 } },
        {
          name: "sys",
          in: "query",
          description: "Include system-defined roles",
          schema: { type: "boolean", default: true },
        },
        {
          name: "branchId",
          in: "query",
          description: "Restrict results to a specific branch; defaults to the effective tenant's branch",
          schema: { type: "string", format: "uuid", nullable: true },
        },
      ],
      responses: {
        "200": {
          description: "List of roles, each annotated with its member count",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  roles: { type: "array", items: GetRolesResponseItemSchema },
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
      tags: ["RBAC"],
      summary: "Create a role",
      description:
        "Creates a role under the caller's effective organization/branch (or the explicit organizationId/branchId, if provided) and optionally assigns an initial set of permissions to it.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                organizationId: { type: "string", format: "uuid", nullable: true },
                branchId: { type: "string", format: "uuid", nullable: true },
                name: { type: "string", maxLength: 255 },
                description: { type: "string", maxLength: 1000, nullable: true },
                rank: {
                  type: "integer",
                  description: "Lower rank means higher privilege; must be higher (numerically) than the caller's own top role rank",
                },
                permissions: {
                  type: "array",
                  items: { type: "string", format: "uuid" },
                  description: "Permission IDs to assign to the new role immediately after creation",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Role created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { role: RoleEntitySchema },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "Caller lacks permission, or the requested rank is equal to or higher than the caller's own top role rank",
        },
      },
    },
  },
  "/pvt/u/rbac/roles/{roleId}": {
    put: {
      tags: ["RBAC"],
      summary: "Update a role",
      description:
        "Partial update of a role's name, description, and/or rank. The caller cannot act on a role whose rank is equal to or higher (numerically lower or equal privilege) than their own top role, nor assign a rank that would violate that hierarchy.",
      parameters: [RoleIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                rank: { type: "integer", minimum: 1, maximum: 100 },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Role updated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { role: RoleEntitySchema },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "Caller lacks permission, or the role/requested rank violates the caller's rank hierarchy",
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
    delete: {
      tags: ["RBAC"],
      summary: "Delete a role",
      description:
        "Permanently deletes a role along with its permission mappings and user assignments. System roles cannot be deleted.",
      parameters: [RoleIdParam],
      responses: {
        "200": {
          description: "Role deleted",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { success: { type: "boolean" } },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "Caller lacks permission, the role is a system role, or the role violates the caller's rank hierarchy",
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/rbac/roles/{roleId}/assign": {
    post: {
      tags: ["RBAC"],
      summary: "Assign a role to one or more users",
      parameters: [RoleIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["userIds"],
              properties: {
                userIds: {
                  type: "array",
                  items: { type: "string", format: "uuid" },
                  minItems: 1,
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "User-role mappings created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  mappers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        userId: { type: "string", format: "uuid" },
                        roleId: { type: "string", format: "uuid" },
                        createdAt: { type: "string", format: "date-time", nullable: true },
                        createdBy: { type: "string", format: "uuid", nullable: true },
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
        "403": {
          description: "Caller lacks permission, or the role violates the caller's rank hierarchy",
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/rbac/roles/{roleId}/users": {
    get: {
      tags: ["RBAC"],
      summary: "List users assigned to a role",
      description:
        "Paginated list of users for the role's organization/branch. Set `ru=false` to instead list users NOT currently in the role (useful for an \"add user to role\" picker).",
      parameters: [
        RoleIdParam,
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { name: "search", in: "query", schema: { type: "string" } },
        {
          name: "ru",
          in: "query",
          description: "true = users within the role, false = users outside the role",
          schema: { type: "boolean", default: true },
        },
      ],
      responses: {
        "200": {
          description: "Paginated list of users",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  users: { type: "array", items: RoleUserSchema },
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
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
    delete: {
      tags: ["RBAC"],
      summary: "Remove users from a role",
      parameters: [RoleIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["userIds"],
              properties: {
                userIds: {
                  type: "array",
                  items: { type: "string", format: "uuid" },
                  minItems: 1,
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Users removed from the role",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { success: { type: "boolean" } },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "Caller lacks permission, or the role violates the caller's rank hierarchy",
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/rbac/roles/{roleId}/duplicate": {
    post: {
      tags: ["RBAC"],
      summary: "Duplicate a role",
      description:
        "Creates a copy of the role (named \"<original> (Copy)\") in the same organization/branch, carrying over its active permission assignments.",
      parameters: [RoleIdParam],
      responses: {
        "201": {
          description: "Duplicate role created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { role: RoleEntitySchema },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "Caller lacks permission, or the role violates the caller's rank hierarchy",
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/rbac/roles/{roleId}/status": {
    patch: {
      tags: ["RBAC"],
      summary: "Toggle a role's active status",
      description: "Flips isActive. System roles cannot be toggled.",
      parameters: [RoleIdParam],
      responses: {
        "200": {
          description: "Status toggled; returns the updated role",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { role: RoleEntitySchema },
              },
            },
          },
        },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "Caller lacks permission, the role is a system role, or the role violates the caller's rank hierarchy",
        },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/pvt/u/rbac/users/{userId}/roles": {
    get: {
      tags: ["RBAC"],
      summary: "List roles assigned to a user",
      parameters: [
        UserIdParam,
        { $ref: "#/components/parameters/PageParam" },
        { $ref: "#/components/parameters/LimitParam" },
        { name: "search", in: "query", schema: { type: "string" } },
      ],
      responses: {
        "200": {
          description: "Paginated list of roles assigned to the user",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  roles: { type: "array", items: RoleEntitySchema },
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
  "/pvt/u/rbac/permissions": {
    get: {
      tags: ["RBAC"],
      summary: "List permissions for the effective tenant",
      description:
        "Returns all permissions visible at the effective tenant's scope, each annotated with whether it is currently assigned to the given entity (and whether that assignment comes via a role).",
      parameters: [
        {
          name: "entityId",
          in: "query",
          description: "Role or user ID to check assignment status against",
          schema: { type: "string", format: "uuid", nullable: true },
        },
        EntityTypeQueryParam,
        {
          name: "isPrivilegedPermissionsIncluded",
          in: "query",
          schema: { type: "boolean", default: true },
        },
      ],
      responses: {
        "200": {
          description: "List of permissions",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  permissions: { type: "array", items: PermissionEntityWithAssignedSchema },
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
  "/pvt/u/rbac/permissions/{permissionId}": {
    put: {
      tags: ["RBAC"],
      summary: "Assign a permission to a role or user",
      description:
        "Assigns the permission to the given entity, or reactivates the mapping if it already exists but is inactive. Privileged permissions cannot be assigned by a caller whose own top scope matches the permission's scope.",
      parameters: [PermissionIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["entityType", "entityId"],
              properties: {
                entityType: { type: "integer", enum: [1, 2], description: "1=User, 2=Role" },
                entityId: { type: "string", format: "uuid" },
                scope: {
                  type: "integer",
                  enum: [1, 2, 3, 4, 5],
                  nullable: true,
                  description: "1=Platform, 2=Organization, 3=Branch, 4=Reseller, 5=Common",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Permission assigned (or mapping reactivated)",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { mapper: PermissionMapperEntitySchema },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "Caller lacks permission, the permission is privileged at the caller's own scope, or the target role/user violates the caller's rank hierarchy",
        },
        "404": {
          description: "Permission not found (or, for entityType=ROLE/USER hierarchy checks, the target role not found)",
        },
      },
    },
    patch: {
      tags: ["RBAC"],
      summary: "Remove a permission from a role or user",
      description:
        "Deactivates the permission mapping for the given entity. Privileged permissions cannot be removed by a caller whose own top scope matches the permission's scope.",
      parameters: [PermissionIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["entityType", "entityId"],
              properties: {
                entityType: { type: "integer", enum: [1, 2], description: "1=User, 2=Role" },
                entityId: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Permission mapping removed",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { mapper: PermissionMapperEntitySchema },
              },
            },
          },
        },
        "400": { $ref: "#/components/responses/ValidationError" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": {
          description: "Caller lacks permission, the permission is privileged at the caller's own scope, or the target role/user violates the caller's rank hierarchy",
        },
        "404": {
          description: "Permission not found, or no active mapping exists for this permission/entity",
        },
      },
    },
  },
};
