import * as Yup from "yup";

export const DEVICE_CODE_REGEX =
  /^[a-zA-Z]{3}-[1-9a-hA-Hj-nJ-Np-zP-Z]{4}-[1-9a-hA-Hj-nJ-Np-zP-Z]{4}$/;

export const deviceCodeValidator = (
  requiredMessage = "Device code is required",
  invalidFormatMessage = "Invalid device code format",
) =>
  Yup.string()
    .trim()
    .required(requiredMessage)
    .matches(DEVICE_CODE_REGEX, invalidFormatMessage);
