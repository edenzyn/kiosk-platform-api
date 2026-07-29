import type { Request, Response } from "express";
import type { OrganizationService } from "./organization.service";
import { OrganizationValidator } from "./organization.validator";
import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";

export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await OrganizationValidator.create.validate(req.body, {
      stripUnknown: true,
    });
    const result = await this.organizationService.create(data, req.user);
    res.status(HttpStatusCodes.CREATED).json(result);
  };list = async (req: Request, res: Response): Promise<void> => {
    const data = await OrganizationValidator.list.validate(req.query, {
      stripUnknown: true,
    });
    const result = await this.organizationService.list(data);
    res.json(result);
  };}
