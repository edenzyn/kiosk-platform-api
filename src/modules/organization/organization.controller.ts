import type { Request, Response } from "express";
import type { OrganizationService } from "./organization.service";
import { OrganizationValidator } from "./organization.validator";

export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const dto = OrganizationValidator.create.parse(req.body);
    const result = await this.organizationService.create(dto, req.user);
    res.status(201).json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const dto = OrganizationValidator.getById.parse(req.params);
    const result = await this.organizationService.getById(dto);
    res.json(result);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    OrganizationValidator.list.parse(req.query);
    const result = await this.organizationService.list();
    res.json(result);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const dto = OrganizationValidator.update.parse({
      ...req.params,
      ...req.body,
    });
    const result = await this.organizationService.update(dto, req.user);
    res.json(result);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const dto = OrganizationValidator.delete.parse(req.params);
    const result = await this.organizationService.delete(dto);
    res.json(result);
  };
}
