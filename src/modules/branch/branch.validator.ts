import * as yup from "yup";

export const BranchValidator = {
  create: yup.object({
    organizationId: yup.string().uuid().required("Organization ID is required"),
    name: yup.string().max(255).required("Branch name is required"),
    address: yup.string().nullable().optional(),
  }),
};
