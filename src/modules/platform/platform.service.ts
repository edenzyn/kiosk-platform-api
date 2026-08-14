import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import type { UserPermissions } from "../../shared/enums/rbac/user-permission.enum";
import { AppError } from "../../shared/errors/app-error";
import type { RbacRepository } from "../rbac/rbac.repository";
import type { UserRepository } from "../user/user.repository";
import type {
  CheckPlatformUserAuthServiceInput,
  CheckPlatformUserAuthServiceResult,
} from "./platform.types";

export class PlatformService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rbacRepository: RbacRepository,
  ) {}

  async checkPlatformUserAuth(
    input: CheckPlatformUserAuthServiceInput,
  ): Promise<CheckPlatformUserAuthServiceResult> {
    const user = await this.userRepository.findById({ id: input.tokenUser.id });

    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }

    const { password, ...userWithoutPassword } = user;

    const userPermissions = await this.rbacRepository.getUserPermissionKeys({
      userId: user.id,
      organizationId: null,
      branchId: null,
    });

    const topRole = await this.rbacRepository.getUsersTopRankedRole({
      userId: user.id,
    });

    const topRoleDto = topRole
      ? {
          name: topRole.name,
          description: topRole.description,
          rank: topRole.rank,
          isSystem: topRole.isSystem,
        }
      : null;

    return {
      user: userWithoutPassword,
      permissions: Array.from(userPermissions) as UserPermissions[],
      topRole: topRoleDto,
    };
  }
}
