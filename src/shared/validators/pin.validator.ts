import * as Yup from "yup";

export const pinValidator = (
  maxDigits = 4,
  isRequired = true,
  requiredMessage = `${maxDigits}-digit PIN is required`,
) => {
  const min = Math.pow(10, maxDigits - 1);
  const max = Math.pow(10, maxDigits) - 1;

  let validator = Yup.number()
    .typeError("PIN must be a number")
    .integer("PIN must be an integer")
    .min(min, `PIN must be ${maxDigits} digits`)
    .max(max, `PIN must be ${maxDigits} digits`);

  if (isRequired) {
    return validator.required(requiredMessage);
  }

  return validator.nullable().optional();
};
