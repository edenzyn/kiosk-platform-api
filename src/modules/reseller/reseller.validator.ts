import * as Yup from "yup";
import { SortingOrderEnum } from "../../shared/enums/core/sorting-order.enum";
import { UserInvitationStatusEnum } from "../../shared/enums/user/user-invitation-status.enum";
import { emailValidator } from "../../shared/validators/email.validator";
import { paginationQuerySchema } from "../../shared/validators/pagination.validator";

export class ResellerValidator {
  static inviteReseller = Yup.object({
    name: Yup.string().required("Name is required").trim().min(2).max(100),
    email: emailValidator("Invalid email address").required(
      "Email is required",
    ),
  }).noUnknown();

  static getInvitationsQuery = paginationQuerySchema
    .shape({
      search: Yup.string().optional().trim(),
      sortBy: Yup.string()
        .oneOf(["email", "status", "expiresAt", "createdAt"])
        .optional()
        .default("createdAt"),
      sortOrder: Yup.mixed<SortingOrderEnum>()
        .oneOf(Object.values(SortingOrderEnum))
        .optional()
        .default(SortingOrderEnum.DESC),
      status: Yup.number()
        .oneOf(
          Object.values(UserInvitationStatusEnum) as number[],
          "Invalid status",
        )
        .optional(),
    })
    .noUnknown();
}
