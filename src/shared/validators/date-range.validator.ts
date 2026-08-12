import * as Yup from "yup";

/**
 * Reusable Yup date validator that ensures the date is not before a referenced start date field.
 */
export const dateIsAfterRef = (
  refFieldName: string,
  message = "End date cannot be before start date",
) => {
  return Yup.date().test("is-after-ref", message, function (value) {
    const refValue = this.parent?.[refFieldName];
    if (!value || !refValue) return true;

    // Both should be valid dates
    const dateValue = new Date(value);
    const refDateValue = new Date(refValue);
    if (isNaN(dateValue.getTime()) || isNaN(refDateValue.getTime())) {
      return false;
    }

    return dateValue >= refDateValue;
  });
};
