import { NextFunction, Request, Response } from "express";
import { container } from "../config/container";
import { env } from "../config/env";
import { RbacService } from "../modules/rbac/rbac.service";
import ERROR_MESSAGES from "../shared/constants/error-messages.constants";
import { HttpStatusCodes } from "../shared/constants/http-status-codes.constants";
import { CustomRequestHeaders } from "../shared/enums/core/custom-request-headers.enum";
import { ErrorCodes } from "../shared/enums/core/error-codes.enum";
import { UserPermissions } from "../shared/enums/rbac/user-permission.enum";
import { AppError } from "../shared/errors/app-error";

const isReadAction = (permission: string): boolean =>
  permission.endsWith(":read");

export interface AccessPermissions {
  organization?: UserPermissions[];
  branch?: UserPermissions[];
}

export const accessMiddleware = (permissions: AccessPermissions) => {
  const rbacService = container.resolve<RbacService>("rbacService");

  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      const userOrgId = req.user?.organizationId;
      const userBranchId = req.user?.branchId;

      if (!userId || !userOrgId) {
        throw new AppError("Unauthorized access", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

      // Determine the user's scope using req.user
      const isUserBranchScoped = !!(userOrgId && userBranchId);

      // Validate requested tenant IDs against the authenticated user's scope
      const reqOrgId = req.get(CustomRequestHeaders.ORGANIZATION_ID);
      const reqBranchId = req.get(CustomRequestHeaders.BRANCH_ID);

      let validatedOrgId: string;
      let validatedBranchId: string | null = null;

      if (isUserBranchScoped) {
        validatedOrgId = userOrgId;
        validatedBranchId = userBranchId;

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

      // Perform the required permission check based on the validated scope
      const userPermissions = await rbacService.getUserPermissionKeys({
        userId,
        organizationId: validatedOrgId,
        branchId: validatedBranchId,
      });

      const permissionsToCheck = isUserBranchScoped
        ? permissions.branch || []
        : permissions.organization || [];

      if (env.NODE_ENV === "development") {
        console.log({
          "REQUIRED PERMISSIONS": permissionsToCheck,
          "PERMISSION USER HAVE": userPermissions,
        });
      }

      const hasPermission = permissionsToCheck.some((perm) => {
        if (userPermissions.has(UserPermissions.ALL_WRITE)) {
          return true;
        }

        if (
          isReadAction(perm) &&
          userPermissions.has(UserPermissions.ALL_READ)
        ) {
          return true;
        }

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

      // Only after the scope and permission checks succeed, populate req.effectiveTenant
      req.effectiveTenant = {
        organizationId: validatedOrgId,
        branchId: validatedBranchId,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};
