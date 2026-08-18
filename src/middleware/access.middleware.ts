import { NextFunction, Request, Response } from "express";
import { container } from "../config/container";
import { env } from "../config/env";
import { RbacService } from "../modules/rbac/rbac.service";
import ERROR_MESSAGES from "../shared/constants/error-messages.constants";
import { HttpStatusCodes } from "../shared/constants/http-status-codes.constants";
import { ClientTypeEnum } from "../shared/enums/core/client-type.enum";
import { CustomRequestHeaders } from "../shared/enums/core/custom-request-headers.enum";
import { ErrorCodes } from "../shared/enums/core/error-codes.enum";
import { UserPermissions } from "../shared/enums/rbac/user-permission.enum";
import { UserScopeTypeEnums } from "../shared/enums/user/user-scope-type.enum";
import { UserTypeEnums } from "../shared/enums/user/user-type.enum";
import { AppError } from "../shared/errors/app-error";
import { getUserScope } from "../shared/utils/user/user-scope.helper";

const isReadAction = (permission: string): boolean =>
  permission.endsWith(":read");

export interface AccessPermissions {
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
          throw new AppError("Unauthorized access", {
            statusCode: HttpStatusCodes.UNAUTHORIZED,
            code: ErrorCodes.UNAUTHORIZED,
          });
        }
        // TODO: Device permission validation should check from here in future if needed
        return next();
      }

      const userId = req.user?.id;
      const userType = req.user?.userType ?? UserTypeEnums.NORMAL;

      if (!userId) {
        throw new AppError("Unauthorized access", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

      // Check User Type
      const allowedTypes = Array.isArray(allowedUserType)
        ? allowedUserType
        : [allowedUserType];

      if (!allowedTypes.includes(userType)) {
        throw new AppError(ERROR_MESSAGES.PERMISSION_DENIED, {
          statusCode: HttpStatusCodes.FORBIDDEN,
          code: ErrorCodes.FORBIDDEN,
        });
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
          throw new AppError(ERROR_MESSAGES.PERMISSION_DENIED, {
            statusCode: HttpStatusCodes.FORBIDDEN,
            code: ErrorCodes.FORBIDDEN,
          });
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
          throw new AppError(ERROR_MESSAGES.PERMISSION_DENIED, {
            statusCode: HttpStatusCodes.FORBIDDEN,
            code: ErrorCodes.FORBIDDEN,
          });
        }

        return next();
      }

      // ====================================================
      // 3. Tenant User Check (Organization & Branch Scope)
      // ====================================================
      const userOrgId = req.user?.organizationId;
      const userBranchId = req.user?.branchId;

      if (!userOrgId) {
        throw new AppError("Unauthorized access", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
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
          throw new AppError(ERROR_MESSAGES.PERMISSION_DENIED, {
            statusCode: HttpStatusCodes.FORBIDDEN,
            code: ErrorCodes.FORBIDDEN,
          });
        }
        if (reqBranchId && reqBranchId !== userBranchId) {
          throw new AppError(ERROR_MESSAGES.PERMISSION_DENIED, {
            statusCode: HttpStatusCodes.FORBIDDEN,
            code: ErrorCodes.FORBIDDEN,
          });
        }
      } else {
        // User is Organization Scoped
        validatedOrgId = userOrgId;
        if (reqOrgId && reqOrgId !== userOrgId) {
          throw new AppError(ERROR_MESSAGES.PERMISSION_DENIED, {
            statusCode: HttpStatusCodes.FORBIDDEN,
            code: ErrorCodes.FORBIDDEN,
          });
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
        throw new AppError(ERROR_MESSAGES.PERMISSION_DENIED, {
          statusCode: HttpStatusCodes.FORBIDDEN,
          code: ErrorCodes.FORBIDDEN,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
