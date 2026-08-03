import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { CreatePermissionMapperRequestDto } from "./dtos/create-permission-mapper-request.dto";
import type { CreatePermissionRequestDto } from "./dtos/create-permission-request.dto";
import type { CreateRoleRequestDto } from "./dtos/create-role-request.dto";
import type { CreateUserRoleMapperRequestDto } from "./dtos/create-user-role-mapper-request.dto";
import type { GetRolesRequestDto } from "./dtos/get-roles-request.dto";
import type { RbacService } from "./rbac.service";
import { RbacValidator } from "./rbac.validator";

export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  createRole = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.createRole.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const role = await this.rbacService.createRole(
      data as Omit<CreateRoleRequestDto, "createdBy">,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.CREATED).json({ role });
  };

  createPermission = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.createPermission.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const permission = await this.rbacService.createPermission(
      data as Omit<CreatePermissionRequestDto, "createdBy">,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.CREATED).json({ permission });
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
      data as Omit<CreatePermissionMapperRequestDto, "createdBy">,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.CREATED).json({ mapper });
  };

  createUserRoleMapper = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.createUserRoleMapper.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const mapper = await this.rbacService.createUserRoleMapper(
      data as Omit<CreateUserRoleMapperRequestDto, "createdBy">,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.CREATED).json({ mapper });
  };

  getRoles = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.getRoles.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const roles = await this.rbacService.getRoles(
      data as GetRolesRequestDto,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.OK).json({ roles });
  };
}
