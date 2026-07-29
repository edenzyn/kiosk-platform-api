import type { UserRepository } from "../user/user.repository";
import type {
  LoginResult,
  RegisterUserResponseDto,
  LoginUserRequestDto,
  RegisterUserRequestDto,
} from "./auth.types";
import { generateToken, verifyToken } from "../../shared/utils/jwt.helper";
import {
  hashPassword,
  comparePassword,
} from "../../shared/utils/password.helper";
import { UserTypeEnums } from "../../shared/enums/user-type.enum";
import { AppError } from "../../shared/errors/app-error";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type jwt from "jsonwebtoken";
import { env } from "../../config/env";

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  private _generateAuthTokens(id: string) {
    const accessToken = generateToken({ user: { id } }, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });
    const refreshToken = generateToken(
      { user: { id } },
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
    const existingUserByEmail = await this.userRepository.findByEmail(
      dto.email,
    );
    if (existingUserByEmail) {
      throw new AppError("Email is already registered", {
        statusCode: HttpStatusCodes.CONFLICT,
      });
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      userType: UserTypeEnums.NORMAL,
    });

    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword };
  }

  async login(dto: LoginUserRequestDto): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new AppError("Invalid Credentials", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    const isMatch = await comparePassword(dto.password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid Credentials", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
      });
    }

    const { password, ...userWithoutPassword } = user;
    const tokens = this._generateAuthTokens(user.id);

    return { user: userWithoutPassword, tokens };
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
    try {
      const decoded = verifyToken<{ user?: { id: string } }>(
        refreshToken,
        env.JWT_REFRESH_SECRET,
      );

      if (!decoded.user?.id) {
        throw new AppError("Invalid or expired refresh token", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

      const user = await this.userRepository.findById(decoded.user.id);
      if (!user) {
        throw new AppError("Invalid or expired refresh token", {
          statusCode: HttpStatusCodes.UNAUTHORIZED,
          code: ErrorCodes.UNAUTHORIZED,
        });
      }

      const { password, ...userWithoutPassword } = user;

      const accessToken = generateToken(
        { user: { id: user.id } },
        env.JWT_ACCESS_SECRET,
        {
          expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
        },
      );

      return {
        user: userWithoutPassword,
        tokens: { accessToken, refreshToken },
      };
    } catch (error) {
      throw new AppError("Invalid or expired refresh token", {
        statusCode: HttpStatusCodes.UNAUTHORIZED,
        code: ErrorCodes.UNAUTHORIZED,
      });
    }
  }
}
