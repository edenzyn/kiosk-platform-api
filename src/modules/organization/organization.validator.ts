import { z } from "zod";

export class OrganizationValidator {
  static readonly create = z
    .object({
      name: z.string().trim().min(2).max(255),
    })
    .strict();

  static readonly getById = z
    .object({
      id: z.string().uuid({ message: "Invalid organization ID" }),
    })
    .strict();

  static readonly list = z.object({}).strict(); // Empty for now, but can add pagination/filtering later

  static readonly update = z
    .object({
      id: z.string().uuid({ message: "Invalid organization ID" }),
      name: z.string().trim().min(2).max(255).optional(),
      isActive: z.boolean().optional(),
    })
    .strict();

  static readonly delete = z
    .object({
      id: z.string().uuid({ message: "Invalid organization ID" }),
    })
    .strict();
}

export type CreateOrganizationRequestDto = z.infer<
  typeof OrganizationValidator.create
>;
export type GetOrganizationRequestDto = z.infer<
  typeof OrganizationValidator.getById
>;
export type ListOrganizationRequestDto = z.infer<
  typeof OrganizationValidator.list
>;
export type UpdateOrganizationRequestDto = z.infer<
  typeof OrganizationValidator.update
>;
export type DeleteOrganizationRequestDto = z.infer<
  typeof OrganizationValidator.delete
>;
