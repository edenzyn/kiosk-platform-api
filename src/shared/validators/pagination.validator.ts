import * as yup from "yup";

export const paginationQuerySchema = yup.object({
  page: yup
    .number()
    .integer("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),
  limit: yup
    .number()
    .integer("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10),
});
