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

  static readonly acceptInvitation = Yup.object({
    token: Yup.string().required("Invitation key is required"),
    name: Yup.string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .required("Name is required"),
    password: passwordValidator().required("Password is required"),
  }).noUnknown();
}
