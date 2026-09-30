import * as Yup from "yup";

interface NumericEnumValidatorOptions<T extends number> {
  exclude?: T[];
  invalidMessage?: string;
}

export const numericEnumValidator = <T extends number>(
  enumObject: Record<string, string | T>,
  fieldLabel: string,
  options: NumericEnumValidatorOptions<T> = {},
) => {
  const { exclude = [], invalidMessage } = options;
  const values = Object.values(enumObject).filter(
    (value): value is T =>
      typeof value === "number" && !exclude.includes(value),
  );

  return Yup.number<T>()
    .typeError(`${fieldLabel} must be a number`)
    .oneOf(values, invalidMessage ?? `Invalid ${fieldLabel.toLowerCase()}`);
};
