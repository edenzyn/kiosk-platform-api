import { Request, Response, NextFunction } from "express";
import { RbacService } from "../modules/rbac/rbac.service";
import { container } from "../config/container";
import { UserPermissions } from "../shared/enums/rbac/user-permission.enum";
import { AppError } from "../shared/errors/app-error";
import { ErrorCodes } from "../shared/enums/core/error-codes.enum";
import { HttpStatusCodes } from "../shared/constants/http-status-codes.constants";

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

      const userPermissionsSet = await rbacService.getUserPermissions({
        userId,
        organizationId,
        branchId,
      });
      const userPermissions = Array.from(userPermissionsSet);

      const hasPermission = permissionsToCheck.some((perm) => {
        if (userPermissions.includes(UserPermissions.ALL_WRITE)) return true;
        if (
          isReadAction(perm) &&
          userPermissions.includes(UserPermissions.ALL_READ)
        ) {
          return true;
        }
        return userPermissions.includes(perm);
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
