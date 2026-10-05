import * as yup from "yup";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class BusinessDayValidator {
  static openBusinessDay = yup
    .object({
      closePreviousDay: yup
        .boolean()
        .typeError("closePreviousDay must be true or false")
        .default(false),
    })
    .noUnknown();

  static getBusinessDaysQuery = paginationQuerySchema
    .shape({
      fromDate: yup
        .string()
        .matches(BUSINESS_DATE_PATTERN, "From date must be YYYY-MM-DD")
        .optional(),
      toDate: yup
        .string()
        .matches(BUSINESS_DATE_PATTERN, "To date must be YYYY-MM-DD")
        .test(
          "is-on-or-after-from-date",
          "To date must be on or after the from date",
          function (value) {
            const { fromDate } = this.parent as { fromDate?: string };
            return !value || !fromDate || value >= fromDate;
          },
        )
        .optional(),
      sortOrder: yup
        .string()
        .oneOf(Object.values(SortingOrderEnum), "Invalid sort order")
        .optional(),
    })
    .noUnknown();

  static businessDayIdParams = yup
    .object({
      id: yup
        .string()
        .uuid("Invalid business day id")
        .required("Business day id is required"),
    })
    .noUnknown();
}
