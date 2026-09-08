import * as Yup from "yup";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";

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
  }).noUnknown();

  // Country and currency lock in the plans/pricing/licenses issued against
  // this market, so only the display name can change after creation.
  static updateMarket = Yup.object({
    name: Yup.string().required("Name is required").trim().min(2).max(100),
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
