import type { Request, Response } from "express";
import type { RbacService } from "./rbac.service";
import { RbacValidator } from "./rbac.validator";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type {
  CreateRoleDto,
  CreatePermissionDto,
  CreatePermissionMapperDto,
  CreateUserRoleMapperDto,
} from "./rbac.types";
import { UserTokenDto } from "../../shared/dtos/user-token.dto";

export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  createRole = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.createRole.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const role = await this.rbacService.createRole(
      data as CreateRoleDto,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.CREATED).json(role);
  };

  createPermission = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.createPermission.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const permission = await this.rbacService.createPermission(
      data as Omit<CreatePermissionDto, "createdBy">,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.CREATED).json(permission);
  };

  createPermissionMapper = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await RbacValidator.createPermissionMapper.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const mapper = await this.rbacService.createPermissionMapper(
      data as Omit<CreatePermissionMapperDto, "createdBy">,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.CREATED).json(mapper);
  };

  createUserRoleMapper = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.createUserRoleMapper.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const mapper = await this.rbacService.createUserRoleMapper(
      data as Omit<CreateUserRoleMapperDto, "createdBy">,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.CREATED).json(mapper);
  };
}
