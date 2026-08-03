import { NextFunction, Request, Response } from "express";
import { container } from "../config/container";
import { RbacService } from "../modules/rbac/rbac.service";
import { HttpStatusCodes } from "../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../shared/enums/core/error-codes.enum";
import { UserPermissions } from "../shared/enums/rbac/user-permission.enum";
import { AppError } from "../shared/errors/app-error";

const isReadAction = (permission: string): boolean =>
  permission.endsWith(":read");

export const permissionCheck = (
  requiredPermission: UserPermissions | UserPermissions[],
) => {
  const rbacService = container.resolve<RbacService>("rbacService");
  const permissionsToCheck = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const authReq = req;
      const userId = authReq.user?.id;
      const organizationId = authReq.user?.organizationId;
      const branchId = authReq.user?.branchId;

      if (!userId) {
        throw new AppError("Unauthorized access", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
        });
      }

      const userPermissions = await rbacService.getUserPermissionKeys({
        userId,
        organizationId,
        branchId,
      });

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

        return userPermissions.has(perm);
      });

      if (!hasPermission) {
        throw new AppError(
          "You do not have sufficient permissions to perform this action",
          {
            statusCode: HttpStatusCodes.FORBIDDEN,
            code: ErrorCodes.FORBIDDEN,
          },
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
