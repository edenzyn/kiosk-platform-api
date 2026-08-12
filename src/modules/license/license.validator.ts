import * as yup from "yup";

export const LicenseValidator = {
  activate: yup.object({
    licenseKey: yup
      .string()
      .trim()
      .required("License key is required"),
  }),
};
