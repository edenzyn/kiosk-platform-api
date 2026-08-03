import * as yup from "yup";
import { PermissionEntityType } from "../../shared/enums/rbac/permission-entity-type.enum";

export const RbacValidator = {
  createRole: yup.object({
    organizationId: yup.string().uuid().nullable().optional(),
    branchId: yup.string().uuid().nullable().optional(),
    name: yup.string().max(255).required("Name is required"),
    description: yup.string().max(1000).nullable().optional(),
  }),

  createPermissionMapper: yup.object({
    entityType: yup
      .number()
      .oneOf(
        Object.values(PermissionEntityType).filter(
          (v): v is number => typeof v === "number",
        ),
      )
      .required("Entity type is required"),
    entityId: yup.string().uuid().required("Entity ID is required"),
    permissionId: yup.string().uuid().required("Permission ID is required"),
  }),

  createUserRoleMapper: yup.object({
    userId: yup.string().uuid().required("User ID is required"),
    roleId: yup.string().uuid().required("Role ID is required"),
  }),

  getRolesByTenant: yup.object({
    search: yup.string().max(255).optional(),
  }),

  getPermissionsByTenant: yup.object({
    entityId: yup.string().uuid().required("Entity ID is required"),
    entityType: yup
      .number()
      .oneOf(
        Object.values(PermissionEntityType).filter(
          (v): v is number => typeof v === "number",
        ),
      )
      .required("Entity type is required"),
  }),
};
