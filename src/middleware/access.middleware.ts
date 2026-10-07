import { NextFunction, Request, Response } from "express";
import { container } from "../config/container";
import { env } from "../config/env";
import { RbacService } from "../modules/rbac/rbac.service";
import { STAFF_DEVICE_TYPES } from "../shared/constants/device.constants";
import ERROR_MESSAGES from "../shared/constants/error-messages.constants";
import { ClientTypeEnum } from "../shared/enums/core/client-type.enum";
import { DeviceTypeEnum } from "../shared/enums/device/device-type.enum";
import { CustomRequestHeaders } from "../shared/enums/core/custom-request-headers.enum";
import { ErrorCodes } from "../shared/enums/core/error-codes.enum";
import { UserPermissions } from "../shared/enums/rbac/user-permission.enum";
import { UserScopeTypeEnums } from "../shared/enums/user/user-scope-type.enum";
import { UserTypeEnums } from "../shared/enums/user/user-type.enum";
import { ForbiddenError } from "../shared/errors/forbidden-error";
import { UnauthorizedError } from "../shared/errors/unauthorized-error";
import { getUserScope } from "../shared/utils/user/user-scope.helper";
import { verifyDeviceStaffToken } from "./device-staff.middleware";

const isReadAction = (permission: string): boolean =>
  permission.endsWith(":read");

export interface AccessPermissions {
  deviceType?: DeviceTypeEnum | DeviceTypeEnum[];
  /** Skips the staff permission check on counter and KDS devices; only for the staff sign-in routes. */
  allowWithoutStaff?: boolean;
  userType?: UserTypeEnums | UserTypeEnums[];
  platform?: UserPermissions[];
  reseller?: UserPermissions[];
  organization?: UserPermissions[];
  branch?: UserPermissions[];
}

export const accessMiddleware = (
  permissions: AccessPermissions = {},
  allowedUserType: UserTypeEnums | UserTypeEnums[] = permissions.userType ??
    UserTypeEnums.NORMAL,
) => {
  const rbacService = container.resolve<RbacService>("rbacService");

  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (req.clientType === ClientTypeEnum.DEVICE_CLIENT) {
        if (!req.device) {
          throw new UnauthorizedError("Unauthorized access", {
            code: ErrorCodes.UNAUTHORIZED,
          });
        }

        if (permissions.deviceType !== undefined) {
          const allowedDeviceTypes = Array.isArray(permissions.deviceType)
            ? permissions.deviceType
            : [permissions.deviceType];

          if (!allowedDeviceTypes.includes(req.device.type)) {
            throw new ForbiddenError(ERROR_MESSAGES.PERMISSION_DENIED);
          }
        }

        if (
          STAFF_DEVICE_TYPES.includes(req.device.type) &&
          !permissions.allowWithoutStaff
        ) {
          const deviceStaff = await verifyDeviceStaffToken(req);

          const hasStaffPermission = await rbacService.hasDeviceStaffPermission(
            {
              userId: deviceStaff.userId,
              organizationId: req.device.organizationId,
              branchId: deviceStaff.userBranchId,
              deviceType: req.device.type,
            },
          );

          if (!hasStaffPermission) {
            throw new ForbiddenError(
              "You don't have permission to use this device",
              { code: ErrorCodes.DEVICE_STAFF_SESSION_EXPIRED },
            );
          }

          req.deviceStaff = deviceStaff;
        }

        return next();
      }

      const userId = req.user?.id;
      const userType = req.user?.userType ?? UserTypeEnums.NORMAL;

      if (!userId) {
        throw new UnauthorizedError("Unauthorized access", {
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

      // Check User Type
      const allowedTypes = Array.isArray(allowedUserType)
        ? allowedUserType
        : [allowedUserType];

      if (!allowedTypes.includes(userType)) {
        throw new ForbiddenError(ERROR_MESSAGES.PERMISSION_DENIED);
      }

      // ====================================================
      // 1. Platform User Check (No Tenant Scope)
      // ====================================================
      if (userType === UserTypeEnums.PLATFORM) {
        const permissionsToCheck = permissions.platform || [];

        // If no platform permissions required, allow authenticated platform user
        if (permissionsToCheck.length === 0) {
          return next();
        }

        const userPermissions = await rbacService.getUserPermissionKeys({
          userId,
          organizationId: null,
          branchId: null,
        });

        if (env.NODE_ENV === "development") {
          console.log({
            "REQUIRED PLATFORM PERMISSIONS": permissionsToCheck,
            "PERMISSION USER HAVE": userPermissions,
          });
        }

        const hasPermission = permissionsToCheck.some((perm) => {
          if (userPermissions.has(UserPermissions.PLATFORM_ALL_WRITE)) {
            return true;
          }

          if (
            isReadAction(perm) &&
            userPermissions.has(UserPermissions.PLATFORM_ALL_READ)
          ) {
            return true;
          }

          return userPermissions.has(perm);
        });

        if (!hasPermission) {
          throw new ForbiddenError(ERROR_MESSAGES.PERMISSION_DENIED);
        }

        return next();
      }

      // ====================================================
      // 2. Reseller User Check (No Tenant Scope)
      // ====================================================
      if (userType === UserTypeEnums.RESELLER) {
        const permissionsToCheck = permissions.reseller || [];

        // If no reseller permissions required, allow authenticated reseller
        if (permissionsToCheck.length === 0) {
          return next();
        }

        const userPermissions = await rbacService.getUserPermissionKeys({
          userId,
          organizationId: null,
          branchId: null,
        });

        if (env.NODE_ENV === "development") {
          console.log({
            "REQUIRED RESELLER PERMISSIONS": permissionsToCheck,
            "PERMISSION USER HAVE": userPermissions,
          });
        }

        const hasPermission = permissionsToCheck.some((perm) =>
          userPermissions.has(perm),
        );

        if (!hasPermission) {
          throw new ForbiddenError(ERROR_MESSAGES.PERMISSION_DENIED);
        }

        return next();
      }

      // ====================================================
      // 3. Tenant User Check (Organization & Branch Scope)
      // ====================================================
      const userOrgId = req.user?.organizationId;
      const userBranchId = req.user?.branchId;

      if (!userOrgId) {
        throw new UnauthorizedError("Unauthorized access", {
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

      // Determine the user's scope using req.user
      const isUserBranchScoped = req.user
        ? getUserScope(req.user) === UserScopeTypeEnums.BRANCH
        : false;

      // Validate requested tenant IDs against the authenticated user's scope
      const reqOrgId = req.get(CustomRequestHeaders.ORGANIZATION_ID);
      const reqBranchId = req.get(CustomRequestHeaders.BRANCH_ID);

      let validatedOrgId: string;
      let validatedBranchId: string | null = null;

      if (isUserBranchScoped) {
        validatedOrgId = userOrgId;
        validatedBranchId = userBranchId || null;

        if (reqOrgId && reqOrgId !== userOrgId) {
          throw new ForbiddenError(ERROR_MESSAGES.PERMISSION_DENIED);
        }
        if (reqBranchId && reqBranchId !== userBranchId) {
          throw new ForbiddenError(ERROR_MESSAGES.PERMISSION_DENIED);
        }
      } else {
        // User is Organization Scoped
        validatedOrgId = userOrgId;
        if (reqOrgId && reqOrgId !== userOrgId) {
          throw new ForbiddenError(ERROR_MESSAGES.PERMISSION_DENIED);
        }

        if (reqBranchId) validatedBranchId = reqBranchId;
      }

      // Only after the scope checks succeed, populate req.effectiveTenant
      req.effectiveTenant = {
        organizationId: validatedOrgId,
        branchId: validatedBranchId,
      };

      const permissionsToCheck = isUserBranchScoped
        ? permissions.branch || []
        : permissions.organization || [];

      // If no permissions required, allow authenticated tenant user
      if (permissionsToCheck.length === 0) {
        return next();
      }

      // Perform the required permission check based on the validated scope
      const userPermissions = await rbacService.getUserPermissionKeys({
        userId,
        organizationId: validatedOrgId,
        branchId: validatedBranchId,
      });

      if (env.NODE_ENV === "development") {
        console.log({
          "REQUIRED PERMISSIONS": permissionsToCheck,
          "PERMISSION USER HAVE": userPermissions,
        });
      }

      const hasPermission = permissionsToCheck.some((perm) => {
        if (isUserBranchScoped) {
          if (userPermissions.has(UserPermissions.BRANCH_ALL_WRITE)) {
            return true;
          }
          if (
            isReadAction(perm) &&
            userPermissions.has(UserPermissions.BRANCH_ALL_READ)
          ) {
            return true;
          }
        } else {
          if (userPermissions.has(UserPermissions.ORGANIZATION_ALL_WRITE)) {
            return true;
          }
          if (
            isReadAction(perm) &&
            userPermissions.has(UserPermissions.ORGANIZATION_ALL_READ)
          ) {
            return true;
          }
        }

        return userPermissions.has(perm);
      });

      if (!hasPermission) {
        throw new ForbiddenError(ERROR_MESSAGES.PERMISSION_DENIED);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
