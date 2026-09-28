import * as yup from "yup";
import { TaxComponentConditionTypeEnum } from "../../../shared/enums/finance/tax-component-condition-type.enum";
import { stringToArray } from "../../../shared/validators/yup.transformer";

export class TaxValidator {
  static getTaxProfileQuery = yup
    .object({
      conditionTypes: stringToArray()
        .of(
          yup
            .number()
            .oneOf(
              Object.values(TaxComponentConditionTypeEnum).filter(
                (value): value is number => typeof value === "number",
              ),
              "Invalid condition type",
            )
            .required(),
        )
        .optional(),
    })
    .noUnknown();

  static getBranchTaxProfileParams = yup
    .object({
      branchId: yup
        .string()
        .uuid("Invalid branch id")
        .required("Branch is required"),
    })
    .noUnknown();

  static updateTaxProfile = yup.object({
    name: yup
      .string()
      .trim()
      .min(1, "Name is required")
      .max(100, "Name cannot exceed 100 characters")
      .required("Name is required"),
    isTaxInclusive: yup.boolean().optional(),
    components: yup
      .array()
      .of(
        yup.object({
          id: yup.string().uuid("Invalid id").optional(),
          name: yup
            .string()
            .trim()
            .min(1, "Component name is required")
            .max(100, "Component name cannot exceed 100 characters")
            .required("Component name is required"),
          conditionType: yup
            .number()
            .typeError("Condition type must be a number")
            .oneOf(
              Object.values(TaxComponentConditionTypeEnum).filter(
                (value): value is number => typeof value === "number",
              ),
              "Invalid condition type",
            )
            .required("Condition type is required"),
          rate: yup
            .number()
            .typeError("Rate must be a number")
            .min(0, "Rate cannot be negative")
            .max(100, "Rate cannot exceed 100")
            .required("Rate is required"),
        }),
      )
      .min(1, "At least one tax component is required")
      .required("At least one tax component is required"),
  });
}
