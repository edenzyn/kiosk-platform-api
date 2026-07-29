import * as Yup from "yup";

export const stringToArray = () => {
  return Yup.array().transform((value, originalValue) => {
    if (typeof originalValue === "string") {
      return originalValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return value;
  });
};
