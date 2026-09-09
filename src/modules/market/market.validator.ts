import * as Yup from "yup";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { AppTaxRuleConditionTypeEnum } from "../../shared/enums/finance/app-tax-rule-condition-type.enum";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";

const taxRuleComponentSchema = Yup.object({
  name: Yup.string()
    .required("Component name is required")
    .trim()
    .min(2)
    .max(100),
  rate: Yup.number()
    .typeError("Rate must be a number")
    .min(0, "Rate cannot be negative")
    .max(100, "Rate cannot exceed 100")
    .required("Rate is required"),
}).noUnknown();

const taxProfileRuleSchema = Yup.object({
  name: Yup.string().required("Rule name is required").trim().min(2).max(100),
  conditionType: Yup.number()
    .typeError("Condition type must be a number")
    .oneOf(
      Object.values(AppTaxRuleConditionTypeEnum) as number[],
      "Invalid condition type",
    )
    .required("Condition type is required"),
  priority: Yup.number().integer().min(1).optional(),
  startsAt: Yup.date().nullable().optional(),
  endsAt: Yup.date()
    .nullable()
    .optional()
    .when("startsAt", ([startsAt], schema) =>
      startsAt
        ? schema.min(startsAt, "End date must be after start date")
        : schema,
    ),
  components: Yup.array()
    .of(taxRuleComponentSchema)
    .min(1, "Add at least one tax component")
    .required("Add at least one tax component"),
}).noUnknown();

const taxConfigurationSchema = Yup.object({
  name: Yup.string().required("Tax profile name is required").trim().min(2).max(100),
  isTaxInclusive: Yup.boolean().required("Tax inclusivity is required"),
  rules: Yup.array()
    .of(taxProfileRuleSchema)
    .min(1, "Add at least one tax rule")
    .required("Add at least one tax rule"),
}).noUnknown();

export class MarketValidator {
  static createMarket = Yup.object({
    countryCode: Yup.string()
      .required("Country code is required")
      .trim()
      .uppercase()
      .length(2, "Country code must be a 2-letter ISO code"),
    name: Yup.string().required("Name is required").trim().min(2).max(100),
    currencyCode: Yup.string()
      .required("Currency code is required")
      .trim()
      .uppercase()
      .length(3, "Currency code must be a 3-letter ISO code"),
    taxConfiguration: taxConfigurationSchema.nullable().optional(),
  }).noUnknown();

  // Country and currency lock in the plans/pricing/licenses issued against
  // this market, so only the display name and tax configuration can change after creation.
  static updateMarket = Yup.object({
    name: Yup.string().required("Name is required").trim().min(2).max(100),
    taxConfiguration: taxConfigurationSchema.nullable().optional(),
  }).noUnknown();

  static getPlatformMarketsQuery = paginationQuerySchema
    .shape({
      search: Yup.string().optional().trim(),
      isActive: Yup.boolean().optional(),
      sortBy: Yup.string()
        .oneOf(["name", "countryCode", "isActive", "createdAt"])
        .optional(),
      sortOrder: Yup.mixed<SortingOrderEnum>()
        .oneOf(Object.values(SortingOrderEnum))
        .optional(),
    })
    .noUnknown();

  static marketIdParam = Yup.object({
    id: Yup.string().uuid("Invalid market ID").required("Market ID is required"),
  }).noUnknown();
}
