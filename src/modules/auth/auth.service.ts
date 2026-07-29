import type { AuthRepository } from "./auth.repository";
import type { LoginResult, RegisterUserResponseDto } from "./auth.types";
import type {
  LoginUserRequestDto,
  RegisterUserRequestDto,
} from "./auth.validator";
import { generateToken } from "../../shared/utils/jwt.helper";
import {
  hashPassword,
  comparePassword,
} from "../../shared/utils/password.helper";
import { UserTypeEnums } from "../../shared/enums/UserTypeEnums";
import { AppError } from "../../shared/errors/app-error";
import type jwt from "jsonwebtoken";
import { env } from "../../config/env";

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  private _generateAuthTokens(userId: string) {
    const accessToken = generateToken({ sub: userId }, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });
    const refreshToken = generateToken(
      { sub: userId },
      env.JWT_REFRESH_SECRET,
      {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      },
    );
    return { accessToken, refreshToken };
  }

  async register(
    dto: RegisterUserRequestDto,
  ): Promise<RegisterUserResponseDto> {
    const existingUserByEmail = await this.authRepository.findByEmail(
      dto.email,
    );
    if (existingUserByEmail) {
      throw new AppError("Email is already registered", {
        statusCode: 409,
      });
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.authRepository.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      userType: UserTypeEnums.NORMAL,
    });

    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword };
  }

  async login(dto: LoginUserRequestDto): Promise<LoginResult> {
    const user = await this.authRepository.findByEmail(dto.email);

    if (!user) {
      throw new AppError("Invalid email or password", {
        statusCode: 401,
      });
    }

    const isMatch = await comparePassword(dto.password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid email or password", {
        statusCode: 401,
      });
    }

    const { password, ...userWithoutPassword } = user;
    const tokens = this._generateAuthTokens(user.id);

    return { user: userWithoutPassword, tokens };
  }
}
