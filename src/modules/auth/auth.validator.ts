import * as Yup from "yup";
import { emailValidator } from "../../shared/validators/email.validator";
import { passwordValidator } from "../../shared/validators/password.validator";

export class AuthValidator {
  static readonly login = Yup.object({
    email: emailValidator("Invalid email address").required(
      "Email is required",
    ),
    password: passwordValidator().required("Password is required"),
  }).noUnknown();
}
