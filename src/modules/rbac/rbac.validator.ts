import * as yup from "yup";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";

export const RbacValidator = {
  createRole: yup.object({
    organizationId: yup.string().uuid().nullable().optional(),
    branchId: yup.string().uuid().nullable().optional(),
    name: yup.string().max(255).required("Name is required"),
    description: yup.string().max(1000).nullable().optional(),
    rank: yup.number().integer().optional(),
    permissions: yup.array().of(yup.string().uuid().required()).optional(),
  }),

  assignPermission: yup.object({
    permissionId: yup.string().uuid().required("Permission ID is required"),
    entityType: yup
      .number()
      .oneOf(
        Object.values(PermissionEntityType).filter(
          (v): v is number => typeof v === "number",
        ),
      )
      .required("Entity type is required"),
    entityId: yup.string().uuid().required("Entity ID is required"),
    scope: yup.number().optional().nullable(),
  }),

  removePermission: yup.object({
    permissionId: yup.string().uuid().required("Permission ID is required"),
    entityType: yup
      .number()
      .oneOf(
        Object.values(PermissionEntityType).filter(
          (v): v is number => typeof v === "number",
        ),
      )
      .required("Entity type is required"),
    entityId: yup.string().uuid().required("Entity ID is required"),
  }),

  createUserRoleMapper: yup.object({
    userId: yup.string().uuid().required("User ID is required"),
    roleId: yup.string().uuid().required("Role ID is required"),
  }),

  getRolesByTenant: yup.object({
    search: yup.string().max(255).optional(),
    sys: yup.boolean().optional().default(true),
  }),

  getPermissionsByTenant: yup.object({
    entityId: yup.string().uuid().nullable().optional(),
    entityType: yup
      .number()
      .oneOf(
        Object.values(PermissionEntityType).filter(
          (v): v is number => typeof v === "number",
        ),
      )
      .nullable()
      .optional(),
    isPrivilegedPermissionsIncluded: yup.boolean().optional().default(true),
  }),

  updateRole: yup.object({
    roleId: yup.string().uuid().required("Role ID is required"),
    name: yup.string().trim().optional(),
    description: yup.string().optional(),
    rank: yup.number().min(1, "Rank must be at least 1").max(100).optional(),
  }),
};
