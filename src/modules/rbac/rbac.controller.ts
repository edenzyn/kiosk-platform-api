import type { Request, Response } from "express";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import { UserTokenDto } from "../../shared/dtos/user-token.dto";
import type { CreateRoleRequestDto } from "./dtos/role/create-role.dtos";
import type { GetPermissionsByTenantRequestDto } from "./dtos/permission/get-permissions-by-tenant.dtos";
import type { GetRolesRequestDto } from "./dtos/role/get-roles.dtos";
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
      req.effectiveTenant as EffectiveTenant,
    );
    res.status(HttpStatusCodes.CREATED).json({ role });
  };

  updateRole = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.updateRole.validate(
      { ...req.body, roleId: req.params.roleId },
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const role = await this.rbacService.updateRole(
      data,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.OK).json({ role });
  };

  assignPermission = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.assignPermission.validate(
      { ...req.body, permissionId: req.params.permissionId },
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const mapper = await this.rbacService.assignPermission(
      {
        permissionId: data.permissionId,
        entityType: data.entityType,
        entityId: data.entityId,
        scope: data.scope,
      },
      req.user as UserTokenDto,
      req.effectiveTenant as EffectiveTenant,
    );

    res.status(HttpStatusCodes.OK).json({ mapper });
  };

  removePermission = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.removePermission.validate(
      { ...req.body, permissionId: req.params.permissionId },
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const mapper = await this.rbacService.removePermission(
      {
        permissionId: data.permissionId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
      req.user as UserTokenDto,
    );

    res.status(HttpStatusCodes.OK).json({ mapper });
  };

  assignRole = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.assignRole.validate(
      { ...req.body, roleId: req.params.roleId },
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const mappers = await this.rbacService.assignRole(
      data.roleId,
      data.userIds,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.CREATED).json({ mappers });
  };

  getRolesByTenantAndScope = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await RbacValidator.getRolesByTenant.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    const roles = await this.rbacService.getRolesByTenantAndScope(
      data as GetRolesRequestDto,
      req.user as UserTokenDto,
      req.effectiveTenant as EffectiveTenant,
    );
    res.status(HttpStatusCodes.OK).json({ roles });
  };

  getPermissionsByScopeAndTenant = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await RbacValidator.getPermissionsByTenant.validate(
      req.query,
      {
        abortEarly: false,
        stripUnknown: true,
      },
    );

    const result = await this.rbacService.getPermissionsByTenant(
      data as GetPermissionsByTenantRequestDto,
      req.effectiveTenant as EffectiveTenant,
    );
    res.status(HttpStatusCodes.OK).json(result);
  };

  getRoleUsers = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.getRoleUsers.validate(
      { ...req.query, roleId: req.params.roleId },
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.rbacService.getUsersByRoleId(
      data.roleId,
      req.user as UserTokenDto,
      {
        page: data.page,
        limit: data.limit,
        search: data.search,
        ru: data.ru,
      },
    );
    res.status(HttpStatusCodes.OK).json(result);
  };

  duplicateRole = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.duplicateRole.validate(
      { roleId: req.params.roleId },
      { abortEarly: false, stripUnknown: true },
    );
    const role = await this.rbacService.duplicateRole(
      data.roleId,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.CREATED).json({ role });
  };

  toggleRoleStatus = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.toggleRoleStatus.validate(
      { roleId: req.params.roleId },
      { abortEarly: false, stripUnknown: true },
    );
    const role = await this.rbacService.toggleRoleStatus(
      data.roleId,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.OK).json({ role });
  };

  deleteRole = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.deleteRole.validate(
      { roleId: req.params.roleId },
      { abortEarly: false, stripUnknown: true },
    );
    const result = await this.rbacService.deleteRole(
      data.roleId,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.OK).json(result);
  };

  removeUserFromRole = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.removeUserFromRole.validate(
      { roleId: req.params.roleId, userIds: req.body.userIds },
      { abortEarly: false, stripUnknown: true },
    );
    const result = await this.rbacService.removeUserFromRole(
      data.roleId,
      data.userIds,
      req.user as UserTokenDto,
    );
    res.status(HttpStatusCodes.OK).json(result);
  };

  getUserRoles = async (req: Request, res: Response): Promise<void> => {
    const data = await RbacValidator.getUserRoles.validate(
      { ...req.query, userId: req.params.userId },
      { abortEarly: false, stripUnknown: true },
    );

    const result = await this.rbacService.getUserRoles({
      userId: data.userId,
      query: {
        page: data.page,
        limit: data.limit,
        search: data.search,
      },
    });

    res.status(HttpStatusCodes.OK).json(result);
  };
}
