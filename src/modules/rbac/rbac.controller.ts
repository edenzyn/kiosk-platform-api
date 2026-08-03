import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { CreatePermissionMapperRequestDto } from "./dtos/create-permission-mapper-request.dto";
import type { CreateRoleRequestDto } from "./dtos/create-role-request.dto";
import type { CreateUserRoleMapperRequestDto } from "./dtos/create-user-role-mapper-request.dto";
import type { GetRolesRequestDto } from "./dtos/get-roles-request.dto";
import type { GetPermissionsByTenantRequestDto } from "./dtos/get-permissions-by-tenant-request.dto";
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

  getRolesByTenant = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.getRolesByTenant.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const roles = await this.rbacService.getRolesByTenant(
      data as GetRolesRequestDto,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.OK).json({ roles });
  };

  getPermissionsByTenant = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.getPermissionsByTenant.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const result = await this.rbacService.getPermissionsByTenant(
      data as GetPermissionsByTenantRequestDto,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.OK).json(result);
  };
}
