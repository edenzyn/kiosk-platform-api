import * as Yup from "yup";
import { emailValidator } from "../../shared/validators/email.validator";
import { stringToArray } from "../../shared/validators/yup.transformer";

export class UserValidator {
  static inviteUser = Yup.object({
    name: Yup.string().required("Name is required").trim().min(2).max(100),
    email: emailValidator("Invalid email address").required(
      "Email is required",
    ),
    roles: stringToArray().of(Yup.string().required()).default([]),
  }).noUnknown();
}
