import * as Yup from "yup";
import { stringToArray } from "../../shared/validators/yup.transformer";

export class OrganizationValidator {
  static readonly create = Yup.object({
    name: Yup.string().trim().min(2).max(255).required(),
  }).noUnknown();

  static readonly getById = Yup.object({
    id: Yup.string().uuid("Invalid organization ID").required(),
  }).noUnknown();

  static readonly list = Yup.object({
    orgIds: stringToArray().of(Yup.string().uuid("Invalid organization ID").required()).optional(),
  }).noUnknown();

  static readonly update = Yup.object({
    id: Yup.string().uuid("Invalid organization ID").required(),
    name: Yup.string().trim().min(2).max(255),
    isActive: Yup.boolean(),
  }).noUnknown();

  static readonly delete = Yup.object({
    id: Yup.string().uuid("Invalid organization ID").required(),
  }).noUnknown();
}
