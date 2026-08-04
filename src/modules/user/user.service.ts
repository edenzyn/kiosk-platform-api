import type { UserRepository } from "./user.repository";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { AppError } from "../../shared/errors/app-error";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { GetUsersResponseDto } from "./dtos/get-users-response.dto";
import type { GetUsersRequestDto } from "./dtos/get-users-request.dto";
import type { RbacRepository } from "../rbac/rbac.repository";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rbacRepository: RbacRepository,
  ) {}

  async checkAuth(tokenUser: UserTokenDto) {
    const user = await this.userRepository.findById(tokenUser.id);
    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }
    const { password, ...userWithoutPassword } = user;

    const permissionKeys = await this.rbacRepository.getUserPermissionKeys({
      userId: tokenUser.id,
      organizationId: tokenUser.organizationId,
      branchId: tokenUser.branchId,
    });

    return {
      user: userWithoutPassword,
      permissions: [...permissionKeys],
    };
  }

  async getUsersByTenant(
    queryDto: GetUsersRequestDto,
    userToken: UserTokenDto,
  ): Promise<GetUsersResponseDto> {
    const users = await this.userRepository.findByTenant(
      userToken.organizationId,
      userToken.branchId,
      queryDto.search,
    );

    return { users };
  }
}
