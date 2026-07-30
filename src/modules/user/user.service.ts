import type { UserRepository } from "./user.repository";
import type { UserTokenDto } from "../../shared/dtos/user-token.dto";
import { AppError } from "../../shared/errors/app-error";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { GetUsersResponseDto } from "./dtos/get-users-response.dto";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async checkAuth(tokenUser: UserTokenDto) {
    const user = await this.userRepository.findById(tokenUser.id);
    if (!user) {
      throw new AppError("User not found", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword };
  }

  async getUsers(tokenUser: UserTokenDto): Promise<GetUsersResponseDto> {
    const users = await this.userRepository.findByTenant(
      tokenUser.organizationId,
      tokenUser.branchId,
    );

    return { users };
  }
}
