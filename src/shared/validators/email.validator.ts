import * as Yup from "yup";
import isEmail from "validator/lib/isEmail";

export const emailValidator = (
  message = "Please enter a valid email address",
) =>
  Yup.string()
    .trim()
    .lowercase()
    .test("valid-email", message, (value) => {
      if (!value) return true;

      return isEmail(value, {
        require_tld: true,
        allow_utf8_local_part: false,
        allow_display_name: false,
      });
    });
